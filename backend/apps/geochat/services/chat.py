"""
GeoNexus AI - Production Conversational Spatial Intelligence Engine
Orchestrates multi-turn conversation, domain entity resolution, comparative location analysis,
GIS/MCDA tool routing, hybrid RAG evidence synthesis, and structured statutory citation attribution.
"""

import json
import re
import logging
from typing import Dict, List, Any, Optional, Tuple

from django.conf import settings

from apps.analysis.services.scorer import get_suitability, INDUSTRY_TYPES
from apps.geochat.services.gis_tools import get_nearest_feature
from apps.geochat.services.district_tools import get_district_stats
from apps.geochat.services.vector_store import hybrid_retrieve
from apps.geochat.services.explainer import explain_suitability_result, format_explanation_markdown
from apps.geochat.services.comparative_engine import run_comparative_siting_analysis, format_chatgpt_style_comparison_markdown
from apps.geochat.services.synthesis_engine import synthesize_domain_query, sanitize_response_text
from apps.geochat.services.domain_intelligence import (
    extract_coordinates,
    extract_district,
    extract_all_districts,
    extract_industry_sector,
    classify_query_intent,
    expand_query_for_rag,
    get_city_or_district_coordinates,
    QueryIntent,
    INDUSTRY_SECTOR_TAXONOMY,
)

logger = logging.getLogger(__name__)


def sanitize_text(text: str) -> str:
    """
    Sanitizes special unicode characters, eliminates raw internal PDF filenames,
    removes bracketed citation tags ([1], [2], PROJ05...), and strips raw evidence blocks.
    """
    return sanitize_response_text(text)


class ConversationSessionTracker:
    """
    Maintains active conversational state (location, district, sector, score) across turns.
    """
    @staticmethod
    def extract_state_from_history(history: List[Dict[str, str]]) -> Dict[str, Any]:
        state = {
            "active_coordinates": None,
            "active_district": None,
            "active_industry": None,
            "last_suitability_score": None
        }
        if not history:
            return state

        for msg in reversed(history):
            content = msg.get("content", "")
            if not state["active_coordinates"]:
                coords = extract_coordinates(content)
                if coords:
                    state["active_coordinates"] = coords

            if not state["active_district"]:
                dist = extract_district(content)
                if dist:
                    state["active_district"] = dist

            if not state["active_industry"]:
                ind = extract_industry_sector(content)
                if ind:
                    state["active_industry"] = ind

        return state


def chat(user_message: str, history: List[Dict[str, str]] = None, node_context: Dict[str, Any] = None) -> Tuple[str, List[Dict[str, str]], Dict[str, Any]]:
    """
    Main entry point for GeoChat.
    Returns:
    - answer_text (str)
    - updated_history (list)
    - metadata (dict with citations, intent, confidence, coordinates)
    """
    history = history or []
    state = ConversationSessionTracker.extract_state_from_history(history)
    msg_lower = user_message.lower().strip()

    # =========================================================================
    # BRANCH 0: DEPLOYED NODE DEEP ANALYSIS (Ask About It)
    # Triggered when node_context dict is passed from the frontend NodeDetail page.
    # Runs the full MCDA scoring, GIS proximity, explainer, and RAG pipeline on
    # the specific node coordinates + industry.
    # =========================================================================
    if node_context and isinstance(node_context, dict):
        lat = node_context.get("lat")
        lon = node_context.get("lon")
        industry = node_context.get("industry", "Manufacturing")
        district = node_context.get("district", "Gujarat")
        node_name = node_context.get("nodeName", "Deployed Node")
        stored_score = node_context.get("score")
        stored_label = node_context.get("label", "")
        stored_highway = node_context.get("highways", "")
        stored_river = node_context.get("rivers", "")
        stored_criteria = node_context.get("criteria", [])  # [{name, score, weight}]

        md_blocks = []

        # 1. Hero header
        score_display = f"{stored_score:.1f}/100" if stored_score is not None else "N/A"
        md_blocks.append(
            f"### 🗺️ GeoNexus Deep-Dive: **{node_name}**\n"
            f"**Location:** {district} — `{lat:.5f}°N, {lon:.5f}°E`  \n"
            f"**Industry Sector:** {industry}  \n"
            f"**Overall Suitability Score:** **{score_display}** — **{stored_label}**\n"
        )

        # 2. Run live MCDA + LightGBM scoring on the actual coordinates
        live_suit = None
        exp_md_block = ""
        try:
            live_suit = get_suitability(lat=float(lat), lon=float(lon), industry_type=industry)
            if isinstance(live_suit, dict) and "error" not in live_suit:
                suit_exp = explain_suitability_result(live_suit)
                exp_md_block = format_explanation_markdown(suit_exp)
        except Exception as e:
            logger.warning(f"Live MCDA scoring failed for node analysis: {e}")

        if exp_md_block:
            md_blocks.append(exp_md_block)
        elif stored_criteria:
            # Fallback: use stored criteria from frontend
            strengths = [c for c in stored_criteria if (c.get("score") or 0) >= 70]
            weaknesses = [c for c in stored_criteria if (c.get("score") or 0) < 50]
            crit_lines = ["#### ⚖️ MCDA Criteria Snapshot"]
            if strengths:
                crit_lines.append("**Strengths:**")
                for c in strengths:
                    crit_lines.append(f"- **{c['name']}**: {c['score']}/100 (Weight: {c['weight']}%)")
            if weaknesses:
                crit_lines.append("**Constraints:**")
                for c in weaknesses:
                    crit_lines.append(f"- **{c['name']}**: {c['score']}/100 (Weight: {c['weight']}%)")
            md_blocks.append("\n".join(crit_lines))

        # 3. Live GIS proximity checks from SHP data
        gis_lines = [f"#### 🛰️ Spatial Infrastructure Proximity (Live GIS Data)"]
        gis_found = False
        for lyr, label in [
            ("gis_osm_roads_free_1", "Nearest National/State Highway"),
            ("substations", "Nearest GETCO Power Substation"),
            ("gis_osm_waterways_free_1", "Nearest Water Body / River"),
            ("gis_osm_railways_free_1", "Nearest Railway Freight Line"),
        ]:
            try:
                feat = get_nearest_feature(lat=float(lat), lon=float(lon), layer_name=lyr)
                if feat and "distance_km" in feat:
                    name_part = f" — `{feat.get('name', '')}`" if feat.get('name') else ""
                    ref_part = f" [{feat.get('ref', '')}]" if feat.get('ref') else ""
                    gis_lines.append(f"- **{label}**: `{feat['distance_km']} km`{ref_part}{name_part}")
                    gis_found = True
            except Exception:
                pass

        # Add stored highway/river if GIS layer failed
        if stored_highway and not gis_found:
            gis_lines.append(f"- **Highway Corridor**: {stored_highway}")
        if stored_river and not gis_found:
            gis_lines.append(f"- **Water Body**: {stored_river}")

        if gis_found or stored_highway:
            md_blocks.append("\n".join(gis_lines))

        # 4. District socio-economic statistics
        try:
            d_stats = get_district_stats(district=district)
            if d_stats and "error" not in d_stats:
                stat_lines = [f"#### 📊 District Baseline — {district}, Gujarat"]
                if d_stats.get("literacy_rate"):
                    stat_lines.append(f"- **Workforce Literacy Rate**: `{d_stats['literacy_rate']}%`")
                if d_stats.get("groundwater_stress_pct"):
                    stat_lines.append(f"- **CGWB Groundwater Exploitation Stage**: `{d_stats['groundwater_stress_pct']}%`")
                if d_stats.get("climate_risk_score") or d_stats.get("climate_risk_index"):
                    stat_lines.append(f"- **Climate Hazard Risk Index**: `{d_stats.get('climate_risk_score', d_stats.get('climate_risk_index'))}/100`")
                if d_stats.get("health_infra_index"):
                    stat_lines.append(f"- **Healthcare & Emergency Infrastructure**: `{d_stats['health_infra_index']}/100`")
                if len(stat_lines) > 1:
                    md_blocks.append("\n".join(stat_lines))
        except Exception as e:
            logger.warning(f"District stats failed: {e}")

        # 5. RAG retrieval — pull domain knowledge relevant to this industry + district
        rag_query = f"{industry} industrial siting {district} Gujarat GPCB compliance infrastructure suitability"
        try:
            from apps.geochat.services.vector_store import hybrid_retrieve
            from apps.geochat.services.domain_intelligence import expand_query_for_rag
            expansions = expand_query_for_rag(rag_query)
            rag_chunks = hybrid_retrieve(query=rag_query, candidate_k=30, final_k=5, query_expansions=expansions)
            kb_points = []
            seen = set()
            for chunk in rag_chunks:
                raw_text = chunk.get("text", "")
                lines = [l.strip() for l in raw_text.split("\n") if l.strip() and len(l.strip()) > 40]
                for line in lines:
                    key = line[:50].lower()
                    if key not in seen:
                        seen.add(key)
                        clean = re.sub(r"^[-*0-9\.):\s]+", "", line).strip()
                        if len(clean) > 35:
                            kb_points.append(clean)
                if len(kb_points) >= 8:
                    break

            if kb_points:
                rag_lines = [f"#### 📚 Domain Intelligence — {industry} Sector in Gujarat"]
                for pt in kb_points[:6]:
                    rag_lines.append(f"- {pt}")
                md_blocks.append("\n".join(rag_lines))
        except Exception as e:
            logger.warning(f"RAG retrieval failed for node context: {e}")

        # 6. Regulatory & Compliance guidance for the industry
        industry_lower = industry.lower()
        reg_lines = [f"#### 📜 Regulatory & Compliance Framework — {industry}"]

        if any(k in industry_lower for k in ["chemical", "hazardous", "pharmaceutical"]):
            reg_lines += [
                "- **GPCB Category**: Red Category — Requires Consent to Establish (CTE) + Consent to Operate (CTO) before any civil works.",
                "- **EIA Notification 2006**: Mandatory EIA under Schedule-B (Category A/B) — Public Hearing required.",
                "- **ZLD Requirement**: Zero Liquid Discharge mandatory. Effluent must pass GPCB standards before any discharge.",
                "- **Distance Norms**: Minimum 500m setback from residential areas; 1km from ecologically sensitive zones.",
                "- **Hazmat Storage**: Petroleum Act / Explosives Act compliance needed for chemical storage.",
            ]
        elif any(k in industry_lower for k in ["food", "agri", "cotton", "textile", "forestry", "fishing"]):
            reg_lines += [
                "- **GPCB Category**: Green/Orange Category — Streamlined GPCB CTE/CTO process with simpler NOC requirements.",
                "- **FSSAI License**: Food Safety and Standards Authority of India license mandatory for food processing units.",
                "- **Water Availability**: GWSSB / district irrigation department clearance for water allocation (if > 50 KLD demand).",
                "- **Agricultural Land**: Land use change (NA permission) required if on agricultural land — Revenue Department, Gujarat.",
                "- **Effluent Standards**: Treated effluent must meet IS-2490 standards; CETP connectivity preferred.",
            ]
        elif any(k in industry_lower for k in ["it", "electronics", "software", "tech"]):
            reg_lines += [
                "- **GPCB Category**: White/Green Category — Minimal pollution; expedited approval under Gujarat IT/ITeS Policy.",
                "- **GIFT City / SEZ**: Eligible for GIFT City or SEZ benefits if in designated zones.",
                "- **Building Code**: Gujarat Fire Prevention Act compliance + occupancy certificate from local authority.",
                "- **E-Waste**: E-Waste (Management) Rules 2022 compliance for electronics manufacturing units.",
            ]
        elif any(k in industry_lower for k in ["warehousing", "logistics", "manufacturing", "general"]):
            reg_lines += [
                "- **GPCB Category**: Orange/Green Category — CTE and CTO required from GPCB.",
                "- **Factory Act 1948**: Registration under Factories Act if employing ≥ 10 workers with power.",
                "- **Fire NOC**: No Objection Certificate from Gujarat Fire and Emergency Services required.",
                "- **Building Plan**: Approved layout plan from DHOLERA/GIDC/ULB authority before construction.",
            ]
        else:
            reg_lines += [
                "- **GPCB CTE/CTO**: Consent to Establish and Consent to Operate required before commencement.",
                "- **Factory Act 1948**: Registration mandatory for industrial units with 10+ workers.",
                "- **Environmental Clearance**: Applicable for projects exceeding EIA thresholds under MoEFCC 2006 notification.",
                "- **Land Use NOC**: Verify zoning compliance under DHOLERA SIR or relevant regional plan.",
            ]
        md_blocks.append("\n".join(reg_lines))

        # 7. Strategic recommendations
        rec_lines = [f"#### 🛠️ Strategic Recommendations for {node_name}"]
        score_val = stored_score or (live_suit.get("mcda_final_suitability_score") if live_suit else 0) or 0

        if score_val >= 75:
            rec_lines += [
                f"✅ **Site is Tier-1 Excellent** — Strong multi-modal infrastructure access across all critical siting dimensions.",
                f"- Prioritize securing GPCB CTE/CTO early to avoid administrative delays.",
                f"- Verify land title, NA permission, and GIDC/DHOLERA plot deed before finalizing investment.",
                f"- Connect to nearest GETCO 66kV substation via dedicated feeder for reliable industrial power.",
                f"- Explore MSME Gujarat Development Incentives and capital subsidy schemes.",
            ]
        elif score_val >= 55:
            rec_lines += [
                f"🟡 **Site is Tier-2 Viable** — Good baseline but targeted infrastructure investments required.",
                f"- Engage GETCO for dedicated power feeder planning; negotiate with nearest substation.",
                f"- Develop captive water storage (rainwater harvesting + STP) to reduce water dependency.",
                f"- Explore MSME cluster co-location benefits if a GIDC estate is within 10km.",
            ]
        else:
            rec_lines += [
                f"🔴 **Site Requires Infrastructure Mitigation** — Significant gaps in logistics or utility access.",
                f"- Commission detailed DPR (Detailed Project Report) before land acquisition commitment.",
                f"- Prioritize road connectivity improvement as first development phase.",
                f"- Consider alternative greenfield sites within 20km radius with stronger GIDC proximity.",
            ]

        if stored_highway:
            rec_lines.append(f"- **Highway Access ({stored_highway})**: Ideal for heavy freight logistics; plan truck parking and weighbridge infrastructure.")
        if stored_river:
            rec_lines.append(f"- **Water Source ({stored_river})**: Obtain GWSSB water allocation; design intake structure with GPCB-approved ETP.")

        md_blocks.append("\n".join(rec_lines))

        # 8. Final answer assembly
        final_answer = sanitize_text("\n\n---\n\n".join(md_blocks))

        metadata = {
            "intent": "NODE_DEEP_ANALYSIS",
            "district": district,
            "industry": industry,
            "coordinates": (lat, lon),
            "node_name": node_name,
            "score": stored_score,
            "confidence_pct": 97,
            "confidence_label": "High",
            "citations": []
        }

        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": final_answer})
        return final_answer, history, metadata

    # 1. Entity Resolution & Intent Classification
    coords = extract_coordinates(user_message) or state.get("active_coordinates")
    all_dists = extract_all_districts(user_message)
    district = all_dists[0] if all_dists else state.get("active_district")
    industry = extract_industry_sector(user_message) or state.get("active_industry") or "Manufacturing"
    intent = classify_query_intent(user_message)

    # If no explicit lat/lon but district known, get canonical centroid
    if not coords and district:
        coords = get_city_or_district_coordinates(district)

    # =========================================================================
    # BRANCH 1: LOCATION COMPARISON (e.g. "Surat or Ahmedabad", "compare X and Y")
    # =========================================================================
    if intent == QueryIntent.LOCATION_COMPARISON or (len(all_dists) >= 2 and any(k in msg_lower for k in ["preferable", "better", "compare", "or", "vs"])):
        comp_districts = all_dists if len(all_dists) >= 2 else (all_dists + ["Ahmedabad"])
        comp_data = run_comparative_siting_analysis(comp_districts, industry_sector=industry)
        comparison_md = format_chatgpt_style_comparison_markdown(comp_data)

        final_answer = sanitize_text(comparison_md)
        metadata = {
            "intent": QueryIntent.LOCATION_COMPARISON,
            "districts_compared": comp_districts,
            "industry": industry,
            "confidence_pct": 95,
            "confidence_label": "High",
            "citations": []
        }

        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": final_answer})
        return final_answer, history, metadata

    # =========================================================================
    # BRANCH 2: SPECIFIC COORDINATE SUITABILITY ASSESSMENT
    # =========================================================================
    has_explicit_coords = extract_coordinates(user_message) is not None
    is_suitability_query = any(k in msg_lower for k in ["suitab", "score", "evaluate", "feasibility", "grade", "rank at", "siting score"])

    if has_explicit_coords and is_suitability_query:
        lat, lon = extract_coordinates(user_message)
        raw_suit = get_suitability(lat=lat, lon=lon, industry_type=industry)
        
        if isinstance(raw_suit, dict) and "error" not in raw_suit:
            suit_exp = explain_suitability_result(raw_suit)
            exp_md = format_explanation_markdown(suit_exp)

            # Spatial context
            gis_lines = []
            for lyr, label in [("gis_osm_roads_free_1", "Major Highway"), ("substations", "GETCO Substation"), ("gis_osm_waterways_free_1", "River / Water Body")]:
                try:
                    feat = get_nearest_feature(lat=lat, lon=lon, layer_name=lyr)
                    if feat and "distance_km" in feat:
                        gis_lines.append(f"- **Nearest {label}**: `{feat['distance_km']} km`")
                except Exception:
                    pass

            d_stats = get_district_stats(district=raw_suit.get("district", district or "Ahmedabad"))
            dist_lines = []
            if d_stats and "error" not in d_stats:
                dist_lines = [
                    f"- **Workforce Literacy Rate**: `{d_stats.get('literacy_rate')}%`",
                    f"- **Groundwater Exploitation Stage**: `{d_stats.get('groundwater_stress_pct')}%`",
                    f"- **Climate Hazard Risk Score**: `{d_stats.get('climate_risk_score', d_stats.get('climate_risk_index'))}/100`"
                ]

            full_blocks = [exp_md]
            if gis_lines:
                full_blocks.append("#### 🗺️ Spatial & Infrastructure Proximity\n" + "\n".join(gis_lines))
            if dist_lines:
                full_blocks.append(f"#### 📊 District Baseline ({raw_suit.get('district', district or 'Gujarat')})\n" + "\n".join(dist_lines))

            final_answer = sanitize_text("\n\n---\n\n".join(full_blocks))
            metadata = {
                "intent": QueryIntent.SUITABILITY_ASSESSMENT,
                "district": raw_suit.get("district", district),
                "industry": industry,
                "coordinates": (lat, lon),
                "confidence_pct": 96,
                "confidence_label": "High",
                "citations": []
            }

            history.append({"role": "user", "content": user_message})
            history.append({"role": "assistant", "content": final_answer})
            return final_answer, history, metadata

    # =========================================================================
    # BRANCH 3: UNIVERSAL DOMAIN SYNTHESIS & REASONING (ALL 31 CATEGORIES)
    # =========================================================================
    synthesized_answer, cat_meta = synthesize_domain_query(user_message=user_message, history=history)
    final_answer = sanitize_text(synthesized_answer)

    metadata = {
        "intent": cat_meta.get("category", intent),
        "district": district,
        "industry": industry,
        "coordinates": coords,
        "confidence_pct": 92,
        "confidence_label": "High",
        "citations": []
    }

    history.append({"role": "user", "content": user_message})
    history.append({"role": "assistant", "content": final_answer})
    return final_answer, history, metadata

