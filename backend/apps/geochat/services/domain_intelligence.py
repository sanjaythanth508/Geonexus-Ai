"""
GeoNexus AI - Domain Intelligence & Query Understanding Engine
Provides canonical entity resolution, coordinate extraction, intent classification,
multi-city extraction with fuzzy typo handling, and domain-specific query expansion.
"""

import re
import difflib
from typing import Dict, List, Optional, Tuple, Any

# =====================================================================
# 1. CANONICAL GUJARAT DISTRICT & HUB REGISTRY
# =====================================================================
GUJARAT_DISTRICTS = [
    "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch",
    "Bhavnagar", "Botad", "Chhotaudepur", "Dahod", "Dang", "Devbhumi Dwarka",
    "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch",
    "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal",
    "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar",
    "Tapi", "Vadodara", "Valsad"
]

DISTRICT_ALIASES = {
    "ahmadabad": "Ahmedabad", "ahmedabad": "Ahmedabad", "amdavad": "Ahmedabad", "ahemedabad": "Ahmedabad", "ahemdabad": "Ahmedabad",
    "amreli": "Amreli",
    "anand": "Anand",
    "aravalli": "Aravalli", "aravali": "Aravalli", "modasa": "Aravalli",
    "banaskantha": "Banaskantha", "banas kantha": "Banaskantha", "banaskatha": "Banaskantha", "palanpur": "Banaskantha",
    "bharuch": "Bharuch", "broach": "Bharuch", "ankleshwar": "Bharuch", "dahej": "Bharuch",
    "bhavnagar": "Bhavnagar", "alang": "Bhavnagar",
    "botad": "Botad",
    "chhotaudepur": "Chhotaudepur", "chhota udaipur": "Chhotaudepur", "chhota udepur": "Chhotaudepur",
    "dahod": "Dahod", "dohad": "Dahod",
    "dang": "Dang", "dangs": "Dang", "the dangs": "Dang", "ahwa": "Dang",
    "devbhumi dwarka": "Devbhumi Dwarka", "dwarka": "Devbhumi Dwarka", "khambhalia": "Devbhumi Dwarka",
    "gandhinagar": "Gandhinagar", "gift city": "Gandhinagar",
    "gir somnath": "Gir Somnath", "veraval": "Gir Somnath", "somnath": "Gir Somnath",
    "jamnagar": "Jamnagar", "reliance jamnagar": "Jamnagar", "sikka": "Jamnagar",
    "junagadh": "Junagadh",
    "kheda": "Kheda", "nadiad": "Kheda",
    "kutch": "Kutch", "kachchh": "Kutch", "kachh": "Kutch", "bhuj": "Kutch", "gandhidham": "Kutch", "mundra": "Kutch", "kandla": "Kutch", "anjar": "Kutch",
    "mahisagar": "Mahisagar", "lunawada": "Mahisagar",
    "mehsana": "Mehsana", "mahesana": "Mehsana", "kadi": "Mehsana", "becharaji": "Mehsana",
    "morbi": "Morbi", "wankaner": "Morbi",
    "narmada": "Narmada", "rajpipla": "Narmada", "kevadiya": "Narmada",
    "navsari": "Navsari",
    "panchmahal": "Panchmahal", "panchmahals": "Panchmahal", "panch mahals": "Panchmahal", "godhra": "Panchmahal", "halol": "Panchmahal", "kalol": "Panchmahal",
    "patan": "Patan", "sidhpur": "Patan",
    "porbandar": "Porbandar",
    "rajkot": "Rajkot", "shapar": "Rajkot", "metoda": "Rajkot",
    "sabarkantha": "Sabarkantha", "sabar kantha": "Sabarkantha", "himatnagar": "Sabarkantha",
    "surat": "Surat", "hazira": "Surat", "sachin": "Surat", "pandesara": "Surat", "kadodara": "Surat", "olpad": "Surat",
    "surendranagar": "Surendranagar", "wadhwan": "Surendranagar", "chotila": "Surendranagar", "dhrangadhra": "Surendranagar",
    "tapi": "Tapi", "vyara": "Tapi",
    "vadodara": "Vadodara", "baroda": "Vadodara", "savli": "Vadodara", "waghodia": "Vadodara", "padra": "Vadodara", "por": "Vadodara", "ranoli": "Vadodara",
    "valsad": "Valsad", "vapi": "Valsad", "umargam": "Valsad", "sarigam": "Valsad", "gundlav": "Valsad",
    "sanand": "Ahmedabad", "dholera": "Ahmedabad", "changodar": "Ahmedabad", "bavla": "Ahmedabad", "vatva": "Ahmedabad", "naroda": "Ahmedabad", "odhav": "Ahmedabad", "dholka": "Ahmedabad", "mandal": "Ahmedabad"
}

# Canonical Centroid Coordinates (Lat, Lon) for all 33 Gujarat Districts & Major Hubs
GUJARAT_LOCATION_COORDINATES: Dict[str, Tuple[float, float]] = {
    # 33 Districts
    "Ahmedabad": (23.0225, 72.5714),
    "Amreli": (21.6032, 71.2221),
    "Anand": (22.5645, 72.9289),
    "Aravalli": (23.4633, 73.3034),
    "Banaskantha": (24.1719, 72.4346),
    "Bharuch": (21.7051, 72.9959),
    "Bhavnagar": (21.7645, 72.1519),
    "Botad": (22.1704, 71.6661),
    "Chhotaudepur": (22.3094, 74.0097),
    "Dahod": (22.8376, 74.2562),
    "Dang": (20.7578, 73.6872),
    "Devbhumi Dwarka": (22.2084, 69.6644),
    "Gandhinagar": (23.2156, 72.6369),
    "Gir Somnath": (20.9077, 70.3664),
    "Jamnagar": (22.4707, 70.0577),
    "Junagadh": (21.5222, 70.4579),
    "Kheda": (22.6916, 72.8634),
    "Kutch": (23.2420, 69.6669),
    "Mahisagar": (23.1328, 73.6146),
    "Mehsana": (23.5880, 72.3693),
    "Morbi": (22.8173, 70.8370),
    "Narmada": (21.8708, 73.5028),
    "Navsari": (20.9500, 72.9300),
    "Panchmahal": (22.7758, 73.6149),
    "Patan": (23.8493, 72.1266),
    "Porbandar": (21.6417, 69.6293),
    "Rajkot": (22.3039, 70.8022),
    "Sabarkantha": (23.5977, 73.0645),
    "Surat": (21.1702, 72.8311),
    "Surendranagar": (22.7277, 71.6370),
    "Tapi": (21.1167, 73.4000),
    "Vadodara": (22.3072, 73.1812),
    "Valsad": (20.5992, 72.9342),

    # Major Industrial Clusters / GIDC Hubs
    "sanand": (22.9868, 72.3814),
    "dholera": (22.2472, 72.1932),
    "dahej": (21.7056, 72.5847),
    "ankleshwar": (21.6264, 73.0031),
    "vapi": (20.3719, 72.9042),
    "hazira": (21.1098, 72.6514),
    "mundra": (22.8389, 69.7258),
    "kandla": (23.0118, 70.2195),
    "halol": (22.5028, 73.4714),
    "savli": (22.5617, 73.2217),
    "jhagadia": (21.6983, 73.1511),
    "panoli": (21.5361, 72.9644),
    "nandesari": (22.4147, 73.0883),
    "becharaji": (23.5019, 72.0372),
    "shapar": (22.1844, 70.7811),
    "metoda": (22.2536, 70.6869),
    "gift city": (23.1600, 72.6840),
    "vatva": (22.9567, 72.6375),
    "naroda": (23.0725, 72.6547),
    "sachin": (21.0850, 72.8820),
    "pandesara": (21.1420, 72.8210),
    "bavla": (22.8340, 72.3650),
    "dholka": (22.7200, 72.4600),
    "kadi": (23.3000, 72.3300),
    "changodar": (22.9200, 72.4300)
}

# =====================================================================
# 2. CANONICAL INDUSTRY SECTORS & DOMAIN TAXONOMY
# =====================================================================
INDUSTRY_SECTOR_TAXONOMY = {
    "Cotton": {
        "keywords": ["cotton", "textile", "spinning", "ginning", "weaving", "garment", "apparel", "fabric", "textile mill", "yarn", "denim", "synthetic textile", "processing unit"],
        "cpcb_category": "Orange/Red (Spinning/Ginning/Weaving: Orange; Wet Chemical Dyeing/Bleaching: Red)",
        "primary_regulations": ["Water (Prevention & Control of Pollution) Act 1974", "Gujarat Textile Policy 2024", "CPCB Effluent Standards for Textile Mills", "GPCB CTE/CTO Norms"],
        "critical_buffers": ["Zero Liquid Discharge (ZLD) or Common Effluent Treatment Plant (CETP) connectivity", "Raw cotton ginning cluster access", "Proximity to skilled labor and continuous water/power grids"]
    },
    "Chemical": {
        "keywords": ["chemical", "petrochemical", "dyes", "pigments", "specialty chemical", "chlor-alkali", "fertilizer", "polymer", "solvents", "basic chemicals", "inorganic chemical"],
        "cpcb_category": "Red",
        "primary_regulations": ["Manufacture, Storage and Import of Hazardous Chemical Rules 1989", "EIA Notification 2006 (Schedule 5f/5e)", "GPCB CTE/CTO Procedures"],
        "critical_buffers": ["Critically Polluted Area (CEPI) moratoriums", "Minimum 500m buffer from inhabited zones", "Effluent Conveyance Pipeline / Deep Sea Discharge"]
    },
    "Pharmaceutical": {
        "keywords": ["pharma", "pharmaceutical", "api", "active pharmaceutical ingredient", "formulations", "drug", "bulk drugs", "biotech", "vaccines", "capsules"],
        "cpcb_category": "Red (API/Bulk Drugs) / Orange (Formulations)",
        "primary_regulations": ["EIA Notification 2006 (Category 5f)", "Drugs and Cosmetics Act 1940", "GPCB Hazardous Waste Rules 2016"],
        "critical_buffers": ["TSDF facility proximity for hazardous sludge", "Clean power and zero dust ambient baseline"]
    },
    "Engineering": {
        "keywords": ["engineering", "auto", "automobile", "fabrication", "casting", "machinery", "foundry", "forging", "pumps", "valves", "oem", "components", "cnc"],
        "cpcb_category": "Orange / Green",
        "primary_regulations": ["Factories Act 1948", "GPCB Green/Orange Consent Framework", "Air Act 1981 (DG set / Furnace emissions)"],
        "critical_buffers": ["Proximity to heavy transport corridors (NH-48/NE-1)", "Multi-modal rail freight terminals", "Industrial power feeder (HT)"]
    },
    "Warehousing": {
        "keywords": ["warehouse", "warehousing", "logistics", "storage", "freight", "godown", "cold storage", "supply chain", "distribution center", "fulfillment center"],
        "cpcb_category": "Green/White",
        "primary_regulations": ["Gujarat Town Planning & Urban Development Act", "National Building Code Part 4 (Fire)", "GPCB White/Green Category Exemption"],
        "critical_buffers": ["NH/SH access width > 18m", "Within 10km of major multi-modal freight terminal/port"]
    },
    "IT": {
        "keywords": ["it", "software", "information technology", "bpo", "data center", "electronics", "fintech", "hardware", "semiconductor"],
        "cpcb_category": "White / Green",
        "primary_regulations": ["Gujarat IT/ITeS Policy 2022-27", "Gujarat Semiconductor Policy 2022-27", "E-Waste Management Rules 2022"],
        "critical_buffers": ["Redundant dual-grid 66kV power line", "Fiber optic utility corridor", "Proximity to urban talent center (< 25km)"]
    },
    "Food": {
        "keywords": ["food", "food processing", "dairy", "agro", "beverage", "edible oil", "flour mill", "cold chain", "spices", "seafood"],
        "cpcb_category": "Orange / Green",
        "primary_regulations": ["FSSAI Siting Guidelines", "Water Act 1974 (Organic BOD/COD effluent standards)", "Gujarat Agro-Industrial Policy 2023"],
        "critical_buffers": ["Proximity to APMC agricultural markets & cold storage", "Potable ground/surface water source"]
    },
    "Renewable Energy": {
        "keywords": ["solar", "wind", "renewable", "green hydrogen", "photovoltaic", "battery storage", "bess"],
        "cpcb_category": "White (Solar/Wind) / Orange (Battery Assembly)",
        "primary_regulations": ["Gujarat Renewable Energy Policy 2023", "GETCO Grid Interconnection Norms"],
        "critical_buffers": ["Direct GETCO 220kV/400kV Substation evacuation", "Flat non-agricultural wasteland (> 50 acres)"]
    },
    "Ceramic": {
        "keywords": ["ceramic", "tiles", "sanitaryware", "vitrified", "porcelain", "wall tiles"],
        "cpcb_category": "Orange",
        "primary_regulations": ["Air Act 1981 (Gas-fired kilns vs Coal/Petcoke prohibition)", "GPCB Ceramic Siting Policy"],
        "critical_buffers": ["Natural Gas (PNG) Pipeline connection", "Clay/Raw material transit freight corridor"]
    }
}

# =====================================================================
# 3. QUERY INTENT DEFINITIONS
# =====================================================================
class QueryIntent:
    LOCATION_COMPARISON = "LOCATION_COMPARISON"
    SUITABILITY_ASSESSMENT = "SUITABILITY_ASSESSMENT"
    REGULATION_COMPLIANCE = "REGULATION_COMPLIANCE"
    GIS_PROXIMITY = "GIS_PROXIMITY"
    DISTRICT_INQUIRY = "DISTRICT_INQUIRY"
    SYSTEM_HELP = "SYSTEM_HELP"


def extract_coordinates(text: str) -> Optional[Tuple[float, float]]:
    """
    Extracts explicit (latitude, longitude) coordinate pairs.
    """
    # Pattern 1: Explicit labels
    p_labeled = re.search(
        r"(?:lat(?:itude)?\s*[:=]?\s*([+-]?\d+(?:\.\d+)?))\s*[,;&\s]+\s*(?:lon(?:gitude)?\s*[:=]?\s*([+-]?\d+(?:\.\d+)?))",
        text,
        re.IGNORECASE
    )
    if p_labeled:
        try:
            lat = float(p_labeled.group(1))
            lon = float(p_labeled.group(2))
            if 20.0 <= lat <= 25.0 and 68.0 <= lon <= 75.0:
                return (round(lat, 6), round(lon, 6))
            if 20.0 <= lon <= 25.0 and 68.0 <= lat <= 75.0:
                return (round(lon, 6), round(lat, 6))
        except (ValueError, TypeError):
            pass

    # Pattern 2: Decimal pairs (22.98, 72.38)
    p_pairs = re.findall(r"\(?\s*([+-]?\d{1,2}\.\d+)\s*,\s*([+-]?\d{1,3}\.\d+)\s*\)?", text)
    for p_lat, p_lon in p_pairs:
        try:
            lat = float(p_lat)
            lon = float(p_lon)
            if 20.0 <= lat <= 25.0 and 68.0 <= lon <= 75.0:
                return (round(lat, 6), round(lon, 6))
            if 20.0 <= lon <= 25.0 and 68.0 <= lat <= 75.0:
                return (round(lon, 6), round(lat, 6))
        except (ValueError, TypeError):
            continue

    # Pattern 3: Named industrial hubs (only if explicitly asked for coordinates / feasibility)
    text_lower = text.lower()
    for hub_name, coords in GUJARAT_LOCATION_COORDINATES.items():
        if len(hub_name) > 3 and re.search(rf"\b{re.escape(hub_name.lower())}\b", text_lower):
            # If the user is just asking district stats/inquiry, let district handler handle it
            if not any(k in text_lower for k in ["literacy", "groundwater", "demographics", "population"]):
                return coords

    return None


def get_city_or_district_coordinates(name: str) -> Optional[Tuple[float, float]]:
    """Returns canonical centroid coordinates for any Gujarat district, city, or hub."""
    if not name:
        return None
    name_clean = name.strip()
    if name_clean in GUJARAT_LOCATION_COORDINATES:
        return GUJARAT_LOCATION_COORDINATES[name_clean]
    
    name_lower = name_clean.lower()
    for k, v in GUJARAT_LOCATION_COORDINATES.items():
        if k.lower() == name_lower:
            return v
    
    canon_dist = DISTRICT_ALIASES.get(name_lower)
    if canon_dist and canon_dist in GUJARAT_LOCATION_COORDINATES:
        return GUJARAT_LOCATION_COORDINATES[canon_dist]

    # Fuzzy match
    all_names = list(GUJARAT_LOCATION_COORDINATES.keys()) + list(DISTRICT_ALIASES.keys())
    close = difflib.get_close_matches(name_lower, all_names, n=1, cutoff=0.7)
    if close:
        matched = close[0]
        if matched in GUJARAT_LOCATION_COORDINATES:
            return GUJARAT_LOCATION_COORDINATES[matched]
        canon = DISTRICT_ALIASES.get(matched)
        if canon and canon in GUJARAT_LOCATION_COORDINATES:
            return GUJARAT_LOCATION_COORDINATES[canon]

    return None


def extract_all_districts(text: str) -> List[str]:
    """
    Extracts ALL mentioned Gujarat cities/districts in text in order of appearance.
    Handles typos like 'ahemedabad', 'amdavad', 'surat', etc.
    """
    found = []
    seen = set()
    text_lower = text.lower()

    # 1. Search for all aliases sorted by length descending
    for alias in sorted(DISTRICT_ALIASES.keys(), key=lambda x: -len(x)):
        pattern = rf"\b{re.escape(alias)}\b"
        match = re.search(pattern, text_lower)
        if match:
            canon = DISTRICT_ALIASES[alias]
            if canon not in seen:
                found.append((match.start(), canon))
                seen.add(canon)

    # 2. Search canonical districts
    for dist in GUJARAT_DISTRICTS:
        pattern = rf"\b{re.escape(dist.lower())}\b"
        match = re.search(pattern, text_lower)
        if match and dist not in seen:
            found.append((match.start(), dist))
            seen.add(dist)

    # 3. Fuzzy token scan for misspelled words
    tokens = list(re.finditer(r"\b[a-zA-Z]{4,}\b", text_lower))
    candidate_dict = {**DISTRICT_ALIASES, **{d.lower(): d for d in GUJARAT_DISTRICTS}}
    all_candidate_keys = list(candidate_dict.keys())

    for tok_match in tokens:
        tok = tok_match.group(0)
        start_pos = tok_match.start()
        # Skip if already captured by exact alias
        if any(tok in alias for alias in DISTRICT_ALIASES.keys() if DISTRICT_ALIASES[alias] in seen):
            continue
        close = difflib.get_close_matches(tok, all_candidate_keys, n=1, cutoff=0.78)
        if close:
            canon = candidate_dict[close[0]]
            if canon not in seen:
                found.append((start_pos, canon))
                seen.add(canon)

    # Sort by appearance in original string
    found.sort(key=lambda x: x[0])
    return [item[1] for item in found]


def extract_district(text: str) -> Optional[str]:
    """Identifies the primary Gujarat district in text."""
    all_dists = extract_all_districts(text)
    return all_dists[0] if all_dists else None


def extract_industry_sector(text: str) -> Optional[str]:
    """Maps user query terms to canonical industry sector."""
    text_lower = text.lower()
    for sector, details in INDUSTRY_SECTOR_TAXONOMY.items():
        if sector.lower() in text_lower:
            return sector
        for kw in details["keywords"]:
            if re.search(rf"\b{re.escape(kw)}\b", text_lower):
                return sector

    # Generic fallback
    if any(k in text_lower for k in ["factory", "plant", "industrial setup", "industry", "manufacturing"]):
        return "Engineering"
    return None


def classify_query_intent(text: str) -> str:
    """
    Accurately classifies user query intent.
    """
    text_lower = text.lower()

    # 1. Location Comparison
    has_comp_tokens = any(k in text_lower for k in [
        "preferable", "better", "compare", "comparison", " vs ", " versus ", "which city", "which is better", "which location", " or "
    ])
    extracted_dists = extract_all_districts(text)
    if (len(extracted_dists) >= 2 and has_comp_tokens) or (has_comp_tokens and len(extracted_dists) >= 2) or ("preferable" in text_lower and len(extracted_dists) >= 1):
        return QueryIntent.LOCATION_COMPARISON

    # 2. District Demographics & Baseline Inquiry
    if any(k in text_lower for k in [
        "demographics", "literacy", "groundwater", "water stress",
        "population", "climate risk", "weather hazard", "profile"
    ]):
        return QueryIntent.DISTRICT_INQUIRY

    # 3. Regulation / Statutory Compliance
    if any(k in text_lower for k in [
        "gpcb", "cte", "cto", "consent to establish", "consent to operate", "eia",
        "red category", "orange category", "white category", "green category",
        "clearance", "pollution", "cpcb", "water act", "air act", "zld", "cetp", "tsdf"
    ]):
        return QueryIntent.REGULATION_COMPLIANCE

    # 4. GIS Proximity & Infrastructure Queries
    if any(k in text_lower for k in [
        "nearest", "distance", "how far", "highway", "river", "railway",
        "substation", "gas line", "pipeline", "port", "airport", "gis layer"
    ]):
        return QueryIntent.GIS_PROXIMITY

    # 5. Suitability Assessment
    if any(k in text_lower for k in [
        "suitab", "score", "ml classification", "grade", "rank", "site feasibility", "feasibility"
    ]) or extract_coordinates(text) is not None:
        return QueryIntent.SUITABILITY_ASSESSMENT

    return QueryIntent.SYSTEM_HELP


def expand_query_for_rag(text: str) -> List[str]:
    """Generates synonym and domain query expansions for high-precision hybrid retrieval."""
    expansions = []
    text_lower = text.lower()

    if "cotton" in text_lower or "textile" in text_lower:
        expansions.append("Gujarat Textile Policy 2024 spinning weaving dyeing subsidy effluent standards")
        expansions.append("CPCB textile industry siting ZLD wastewater discharge norms")

    if "chemical" in text_lower:
        expansions.append("GPCB chemical industrial siting CEPI moratorium effluent discharge")
        expansions.append("EIA 2006 Schedule 5f synthetic organic chemicals clearance")

    if "cte" in text_lower or "consent to establish" in text_lower:
        expansions.append("GPCB Consent to Establish CTE checklist guidelines fee schedule")

    if "water" in text_lower:
        expansions.append("CGWB Central Ground Water Authority NOC industrial abstraction guidelines")

    return expansions
