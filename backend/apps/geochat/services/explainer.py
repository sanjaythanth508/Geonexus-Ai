"""
GeoNexus AI - Deep ML/MCDA Model Explainer & Feature Attribution Engine
Provides human-interpretable factor decompositions, positive/negative drivers,
risk blocker analysis, and actionable mitigation roadmaps for industrial siting.
"""

from typing import Dict, Any, List, Optional


CRITERION_HUMAN_LABELS = {
    "dist_local_road_m": "Local Road Access",
    "dist_highway_m": "National/State Highway Proximity",
    "dist_railway_m": "Railway Freight Accessibility",
    "dist_substation_m": "GETCO Power Substation Proximity",
    "dist_transline_m": "High-Voltage Transmission Line Buffer",
    "dist_gasline_m": "Natural Gas (PNG) Pipeline Proximity",
    "dist_river_m": "Surface Water & River Proximity",
    "dist_lake_m": "Waterbody & Lake Buffer",
    "dist_indl_estate_m": "Approved GIDC Industrial Estate Proximity",
    "dist_airport_m": "Commercial Cargo Airport Proximity",
    "dist_port_m": "Deepwater Port / Maritime Connectivity",
    "dist_place_m": "Urban Center & Talent Proximity",
    "poi_density": "Local Commercial & Industrial POI Density",
    "building_density": "Built-up Infrastructure Density",
    "landuse_favorability": "Land Use / Land Cover Siting Favorability",
    "slope_deg": "Topographical Terrain Slope (< 5 deg ideal)",
    "literacy_rate": "District Workforce Literacy & Skill Base",
    "health_infra_index": "Healthcare & Emergency Response Index",
    "water_stress_pct": "CGWB Groundwater Exploitation / Stress",
    "climate_risk_index": "Climate & Weather Hazard Risk Score"
}


def explain_suitability_result(suitability_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deconstructs raw MCDA & LightGBM output into structured, actionable explanations.
    """
    if "error" in suitability_data:
        return {"error": suitability_data["error"]}

    score = suitability_data.get("final_suitability_score", 0.0)
    ml_label = suitability_data.get("ml_predicted_label", "Unknown")
    ml_probs = suitability_data.get("ml_probabilities", {})
    criteria = suitability_data.get("criteria_breakdown", {})
    district = suitability_data.get("district", "Gujarat")
    industry = suitability_data.get("industry_type", "Industrial")
    lat = suitability_data.get("latitude")
    lon = suitability_data.get("longitude")

    # 1. Categorize drivers into Strengths (Score >= 70) and Bottlenecks (Score < 50)
    positive_drivers = []
    negative_drivers = []
    neutral_drivers = []

    for key, val in criteria.items():
        score_100 = val.get("score_100", 50.0)
        weight = val.get("weight", 0.05)
        raw_val = val.get("raw")
        label = CRITERION_HUMAN_LABELS.get(key, key)

        driver_item = {
            "criterion_key": key,
            "name": label,
            "score": score_100,
            "weight_pct": round(weight * 100, 1),
            "raw_value": raw_val,
        }

        if score_100 >= 70.0:
            positive_drivers.append(driver_item)
        elif score_100 < 50.0:
            negative_drivers.append(driver_item)
        else:
            neutral_drivers.append(driver_item)

    # Sort drivers by weighted importance
    positive_drivers.sort(key=lambda x: -(x["score"] * x["weight_pct"]))
    negative_drivers.sort(key=lambda x: (x["score"] * (100.0 - x["weight_pct"])))

    # 2. Derive Key Recommendations
    recommendations = []
    for neg in negative_drivers[:3]:
        crit = neg["criterion_key"]
        if crit == "dist_highway_m":
            recommendations.append("Enhance direct road connectivity to nearest NH/SH corridor to reduce freight transit overhead.")
        elif crit == "dist_substation_m":
            recommendations.append("Plan dedicated 66kV/11kV feeder line extension from nearest GETCO substation.")
        elif crit == "water_stress_pct":
            recommendations.append("Implement Zero Liquid Discharge (ZLD) and rainwater harvesting; groundwater abstraction may face CGWB restrictions.")
        elif crit == "dist_gasline_m":
            recommendations.append("Evaluate alternate energy or PNG branch pipeline spur connectivity.")
        elif crit == "dist_indl_estate_m":
            recommendations.append("Since the location is greenfield (outside notified GIDC), ensure independent CETP and fire NOC planning.")
        elif crit == "climate_risk_index":
            recommendations.append("Incorporate flood defense bunds and elevated plinth designs to protect against monsoon waterlogging.")

    if not recommendations:
        recommendations.append("Site demonstrates balanced infrastructure across all critical siting dimensions.")

    # 3. Overall Qualitative Assessment
    if score >= 80:
        verdict = "Tier-1 Highly Suitable Location with strong multi-modal infrastructure and minimal statutory siting barriers."
    elif score >= 65:
        verdict = "Tier-2 Viable Location with good baseline connectivity, subject to targeted infrastructure planning."
    elif score >= 50:
        verdict = "Moderate Suitability; requires capital expenditure for utility spurs and water/drainage infrastructure."
    else:
        verdict = "Challenging Greenfield Site with significant logistical or environmental constraints."

    return {
        "latitude": lat,
        "longitude": lon,
        "industry": industry,
        "district": district,
        "final_score": score,
        "ml_label": ml_label,
        "ml_confidence_pct": round(ml_probs.get(ml_label, 0.0) * 100, 1),
        "verdict": verdict,
        "positive_drivers": positive_drivers[:4],
        "negative_drivers": negative_drivers[:4],
        "recommendations": recommendations,
        "criteria_count": len(criteria)
    }


def format_explanation_markdown(exp: Dict[str, Any]) -> str:
    """Formats the explanation into high-impact, visual markdown."""
    if "error" in exp:
        return f"> ⚠️ **Analysis Error**: {exp['error']}"

    md = [
        f"### 📍 GeoNexus Siting Assessment: **{exp['industry']}** in **{exp['district']}**",
        f"**Coordinates**: `({exp['latitude']}, {exp['longitude']})` | **Overall MCDA Score**: `{exp['final_score']}/100` | **ML Grade**: **{exp['ml_label']}** ({exp['ml_confidence_pct']}% confidence)",
        "",
        f"> **Verdict**: {exp['verdict']}",
        "",
        "#### 🟢 Key Siting Strengths",
    ]

    for pos in exp["positive_drivers"]:
        raw_str = f" ({pos['raw_value']:.1f}m)" if isinstance(pos.get("raw_value"), (int, float)) and "dist_" in pos["criterion_key"] else ""
        md.append(f"- **{pos['name']}**: Sub-score **{pos['score']}/100** (Weight: {pos['weight_pct']}%){raw_str}")

    if exp["negative_drivers"]:
        md.append("\n#### 🔴 Identified Constraints & Siting Vulnerabilities")
        for neg in exp["negative_drivers"]:
            raw_str = f" ({neg['raw_value']:.1f}m)" if isinstance(neg.get("raw_value"), (int, float)) and "dist_" in neg["criterion_key"] else ""
            md.append(f"- **{neg['name']}**: Sub-score **{neg['score']}/100** (Weight: {neg['weight_pct']}%){raw_str}")

    md.append("\n#### 🛠️ Strategic Engineering Recommendations")
    for rec in exp["recommendations"]:
        md.append(f"- {rec}")

    return "\n".join(md)
