import json, re
import torch
from django.conf import settings
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig

from apps.analysis.services.scorer import get_suitability, INDUSTRY_TYPES  # adjust if your names differ
from apps.geochat.services.gis_tools import get_nearest_feature, _load_layers
from apps.geochat.services.district_tools import get_district_stats
from apps.geochat.services.vector_store import hybrid_retrieve

ALL_INDUSTRY_TYPES = INDUSTRY_TYPES

EVIDENCE_PRIORITY = {
    "gis": 1, "ml_suitability": 1, "dataset": 2,
    "regulations": 3, "industries": 4, "environment": 5, "districts": 5, "geonexus": 6, "general": 7,
}


def estimate_confidence(tool_results: list) -> dict:
    ok = [r for r in tool_results if isinstance(r, dict) and "error" not in r]
    err = [r for r in tool_results if isinstance(r, dict) and "error" in r]
    coverage = len(ok)
    penalty = len(err) * 15
    score = max(10, min(95, 40 + coverage * 15 - penalty))
    label = "High" if score >= 80 else ("Moderate" if score >= 50 else "Low")
    return {"confidence_pct": score, "confidence_label": label,
            "evidence_sources_used": coverage, "evidence_errors": len(err)}


# --- previously undefined in the notebook — implemented here ---
def compare_locations(locations: list, industry_type: str) -> dict:
    """locations: [{'label': str, 'lat': float, 'lon': float}, ...]. Ranks by final_suitability_score."""
    results = []
    for loc in locations:
        r = get_suitability(loc["lat"], loc["lon"], industry_type)
        if "error" not in r:
            r["label"] = loc.get("label", f"({loc['lat']}, {loc['lon']})")
            results.append(r)
    results.sort(key=lambda r: -r["final_suitability_score"])
    return {"industry_type": industry_type, "ranked": results}


TOOLS = [
    {"type": "function", "function": {
        "name": "get_suitability",
        "description": "Get the trained suitability score, ML label, and weakest factors for ONE "
                        "industry type at a specific latitude/longitude in Gujarat.",
        "parameters": {"type": "object", "properties": {
            "lat": {"type": "number"}, "lon": {"type": "number"},
            "industry_type": {"type": "string", "enum": INDUSTRY_TYPES}},
            "required": ["lat", "lon", "industry_type"]}}},
    {"type": "function", "function": {
        "name": "compare_locations",
        "description": "Rank MULTIPLE candidate lat/lon locations for one industry type, best first.",
        "parameters": {"type": "object", "properties": {
            "locations": {"type": "array", "items": {"type": "object", "properties": {
                "label": {"type": "string"}, "lat": {"type": "number"}, "lon": {"type": "number"}},
                "required": ["lat", "lon"]}},
            "industry_type": {"type": "string", "enum": INDUSTRY_TYPES}},
            "required": ["locations", "industry_type"]}}},
    {"type": "function", "function": {
        "name": "get_nearest_feature",
        "description": "Real distance in kilometers from a lat/lon to the nearest feature in a GIS layer.",
        "parameters": {"type": "object", "properties": {
            "lat": {"type": "number"}, "lon": {"type": "number"},
            "layer_name": {"type": "string",
                            "enum": sorted(_load_layers().keys()) if _load_layers() else ["none_loaded"]}},
            "required": ["lat", "lon", "layer_name"]}}},
    {"type": "function", "function": {
        "name": "get_district_stats",
        "description": "Look up population, rainfall, literacy, health, groundwater, climate, land "
                        "price, or any other district-level statistic, for one district.",
        "parameters": {"type": "object", "properties": {"district": {"type": "string"}},
                        "required": ["district"]}}},
    {"type": "function", "function": {
        "name": "retrieve_docs",
        "description": "Search regulations, industry profiles, environmental data, and Gujarat "
                        "district knowledge base for factual/explanatory/regulatory information.",
        "parameters": {"type": "object", "properties": {
            "query": {"type": "string"},
            "doc_type": {"type": "string",
                         "enum": ["regulations", "industries", "environment", "districts", "geonexus", "any"]},
            "industry_type": {"type": "string", "enum": ALL_INDUSTRY_TYPES + ["any"]}},
            "required": ["query"]}}},
]

SYSTEM_PROMPT = (
    "You are the GeoNexus-AI assistant -- a specialist industrial-site-intelligence expert for Gujarat, "
    "India. You are not a general chatbot: you reason over grounded evidence, not general knowledge.\n\n"
    "TOOLS: use get_suitability for one location + one industry; compare_locations for ranking multiple "
    "locations/districts; get_nearest_feature for distance-to-infrastructure questions; get_district_stats "
    "for population/rainfall/literacy/health/groundwater/climate/land-price questions; retrieve_docs for "
    "regulations, guidelines, environmental rules, and general knowledge. For a real siting question, call "
    "get_suitability AND get_nearest_feature AND retrieve_docs together -- not just one -- before answering.\n\n"
    "EVIDENCE HIERARCHY when sources disagree, trust in this order: (1) GIS / get_nearest_feature and ML "
    "suitability, (2) structured district datasets, (3) government regulations, (4) industry guidelines, "
    "(5) environmental documents, (6) general knowledge-base text.\n\n"
    "NEVER fabricate a regulation, score, distance, or district fact -- always call a tool to get it. If a "
    "tool returns an error, say so plainly instead of guessing.\n\n"
    "RESPONSE FORMAT for any non-trivial question: Summary (1-2 lines) -> Key Evidence (bulleted, tag each "
    "with its source) -> Risks or Caveats -> Confidence (High/Moderate/Low + why). For simple factual "
    "questions, a short direct answer with source is enough."
)


def call_tool(name, args):
    if name == "get_suitability":
        return get_suitability(**args)
    if name == "compare_locations":
        return compare_locations(**args)
    if name == "get_nearest_feature":
        return get_nearest_feature(**args)
    if name == "get_district_stats":
        return get_district_stats(**args)
    if name == "retrieve_docs":
        doc_type = args.get("doc_type")
        industry = args.get("industry_type")
        filt = None if (not doc_type or doc_type == "any") else {doc_type}
        ind_filt = None if (not industry or industry == "any") else industry
        results = hybrid_retrieve(args["query"], doc_type_filter=filt, industry_filter=ind_filt, final_k=5)
        return [{"source": r["source"], "doc_type": r["doc_type"], "text": r["text"]} for r in results]
    return {"error": f"Unknown tool {name}"}


# Removed AutoModelForCausalLM to prevent massive downloads
# The chat function now acts as a direct interface to the RAG vector store.

def chat(user_message, history=None, max_tool_rounds=6):
    history = history or []
    history.append({"role": "user", "content": user_message})
    
    # 1. Directly query the FAISS/BM25 vector store using the user's message
    try:
        results = call_tool("retrieve_docs", {"query": user_message, "doc_type": "any", "industry_type": "any"})
    except Exception as e:
        results = [{"error": str(e)}]
    
    # 2. Format the retrieved documents into a clean markdown response
    if isinstance(results, list) and len(results) > 0 and "error" not in results[0]:
        reply = "Here is the most relevant information I found in the GeoNexus database:\n\n"
        for i, res in enumerate(results[:3]):  # Show top 3
            reply += f"### Source: {res.get('source', 'Unknown')} ({res.get('doc_type', 'General')})\n"
            reply += f"{res.get('text', '').strip()}\n\n"
    else:
        reply = "I couldn't find any specific information in the database regarding your query."

    history.append({"role": "assistant", "content": reply})
    return reply, history