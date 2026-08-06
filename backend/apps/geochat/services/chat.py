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


import json, re
import torch
from django.conf import settings
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig

from apps.analysis.services.scorer import get_suitability, INDUSTRY_TYPES
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
import json, re
import torch
from django.conf import settings
from transformers import AutoTokenizer, AutoModelForCausalLM

from apps.analysis.services.scorer import get_suitability, INDUSTRY_TYPES
from apps.geochat.services.gis_tools import get_nearest_feature, _load_layers
from apps.geochat.services.district_tools import get_district_stats
from apps.geochat.services.vector_store import hybrid_retrieve

ALL_INDUSTRY_TYPES = INDUSTRY_TYPES

# --- Load SmolLM2-135M-Instruct ---
# This is a very small model (~270MB) that runs easily on CPU without quantization.
MODEL_NAME = "HuggingFaceTB/SmolLM2-135M-Instruct"
device = "cuda" if torch.cuda.is_available() else "cpu"

try:
    print(f"Loading {MODEL_NAME} on {device}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForCausalLM.from_pretrained(MODEL_NAME).to(device)
    print("SmolLM2 loaded successfully.")
except Exception as e:
    print(f"Warning: Failed to load {MODEL_NAME}: {e}")
    tokenizer, model = None, None

def compare_locations(locations: list, industry_type: str) -> dict:
    results = []
    for loc in locations:
        r = get_suitability(loc["lat"], loc["lon"], industry_type)
        if "error" not in r:
            r["label"] = loc.get("label", f"({loc['lat']}, {loc['lon']})")
            results.append(r)
    results.sort(key=lambda r: -r["final_suitability_score"])
    return {"industry_type": industry_type, "ranked": results}

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
        results = hybrid_retrieve(args["query"], doc_type_filter=filt, industry_filter=ind_filt, final_k=3)
        return [{"source": r["source"], "doc_type": r["doc_type"], "text": r["text"]} for r in results]
    return {"error": f"Unknown tool {name}"}

def extract_lat_lon(text):
    matches = re.findall(r"[-+]?\d*\.\d+|\d+", text)
    if len(matches) >= 2:
        return float(matches[0]), float(matches[1])
    return None, None

def extract_industry(text):
    text_lower = text.lower()
    for ind in ALL_INDUSTRY_TYPES:
        if ind.lower() in text_lower:
            return ind
    return "Chemical"

def generate_conversational_response(user_msg, context_data, history):
    if model is None or tokenizer is None:
        return context_data + "\n\n(Model failed to load, displaying raw data.)"

    system_prompt = (
        "You are GeoNexus-AI, a helpful industrial site intelligence assistant for Gujarat. "
        "Answer the user's question using ONLY the provided Context Data. "
        "Keep your response short, conversational, and direct."
    )
    
    messages = [{"role": "system", "content": system_prompt}]
    
    # Map Django history to standard role/content messages
    for msg in history[-4:]:
        role = msg.get("role", "user")
        # Ensure role is standard (user/assistant)
        if role not in ["user", "assistant", "system"]:
            role = "user"
        messages.append({"role": role, "content": msg.get("content", "")})
        
    messages.append({
        "role": "user",
        "content": f"Context Data:\n{context_data}\n\nQuestion: {user_msg}"
    })

    try:
        prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    except Exception:
        # Fallback if chat template fails
        prompt = f"System: {system_prompt}\n"
        for msg in messages[1:]:
            prompt += f"{msg['role'].capitalize()}: {msg['content']}\n"
        prompt += "Assistant: "

    inputs = tokenizer(prompt, return_tensors="pt").to(device)
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs, 
            max_new_tokens=200, 
            temperature=0.3,
            repetition_penalty=1.25,  # Prevents repeating questions and answers in loops
            do_sample=True,
            eos_token_id=tokenizer.eos_token_id,
            pad_token_id=tokenizer.eos_token_id
        )
    
    response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
    return response.strip()

def chat(user_message, history=None, max_tool_rounds=6):
    # Ensure history is initialized
    history = history or []
    
    context = ""
    msg_lower = user_message.lower()
    
    # 1. Suitability Tool
    if "suitab" in msg_lower or "score" in msg_lower or ("lat" in msg_lower and "lon" in msg_lower):
        lat, lon = extract_lat_lon(user_message)
        if lat is not None and lon is not None:
            industry = extract_industry(user_message)
            suit = call_tool("get_suitability", {"lat": lat, "lon": lon, "industry_type": industry})
            if "error" not in suit:
                context += f"- Suitability Score for {industry} at ({lat}, {lon}) is {suit['final_suitability_score']}/100.\n"
                context += f"- ML Predicted Label: {suit['lightgbm_predicted_label']}.\n"
                context += "- Weakest Factors:\n"
                for factor in suit['weakest_factors']:
                    context += f"  - {factor['factor']}: {factor['score_0_100']}\n"
    
    # 2. Nearest Feature Tool
    if "nearest" in msg_lower or "how far" in msg_lower or "distance" in msg_lower:
        lat, lon = extract_lat_lon(user_message)
        if lat is not None and lon is not None:
            for layer in ["roads", "rivers", "railways", "hospitals"]:
                if layer in msg_lower:
                    near = call_tool("get_nearest_feature", {"lat": lat, "lon": lon, "layer_name": layer})
                    if "error" not in near:
                        context += f"- Distance to nearest {layer}: {near['distance_km']} km away.\n"
                    break

    # 3. RAG Retrieval Tool
    rag = call_tool("retrieve_docs", {"query": user_message, "doc_type": "any", "industry_type": "any"})
    if isinstance(rag, list) and len(rag) > 0 and "error" not in rag[0]:
        context += "- Knowledge Base Excerpts:\n"
        for res in rag[:3]:
            context += f"  [Source: {res.get('source')}]: {res.get('text', '').strip()}\n"

    if not context.strip():
        context = "No specific data found for this query in the database."

    # Let SmolLM2-135M write the conversational answer
    reply = generate_conversational_response(user_message, context, history)
    
    # Save user message and reply to history using standard keys
    history.append({"role": "user", "content": user_message})
    history.append({"role": "assistant", "content": reply})
    return reply, history