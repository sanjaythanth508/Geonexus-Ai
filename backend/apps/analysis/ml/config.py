"""
Ported 1:1 from GeoNexus_v2_Full_Scoring_LightGBM_Pipeline_2.ipynb.

Everything here is *static configuration* — no I/O. Data paths point at
settings.GEONEXUS_DATA_DIR instead of a Colab Drive mount so the same code
runs locally / on the server.

*** ACTION REQUIRED ***
INDUSTRY_TYPE_KEYWORDS below only has the 2 entries that were present in the
uploaded notebook (IT, Cotton). Your .pkl was trained on all 36 industry
types, which means somewhere you have a fuller version of this dict (it's
what tunes MATCHED_TREES / corridor bonuses per industry at prediction time).
Paste your real 36-entry dict in here before this will give correct
corridor-demand bonuses for anything other than IT/Cotton. Nothing else in
this file depends on that count.
"""
import os
import re
from django.conf import settings

# ---------------------------------------------------------------- paths ---
DATA_DIR = getattr(settings, "GEONEXUS_DATA_DIR", os.path.join(settings.BASE_DIR, "data", "gis"))
ML_MODELS_DIR = getattr(settings, "GEONEXUS_ML_MODELS_DIR", os.path.join(settings.BASE_DIR, "apps", "ml_models"))

PATHS = {
    "boundary":            os.path.join(DATA_DIR, "gujarat_districts.shp"),
    "industries":          os.path.join(DATA_DIR, "gujarat_industries_full.shp"),
    "roads":               os.path.join(DATA_DIR, "gis_osm_roads_free_1.shp"),
    "railways":            os.path.join(DATA_DIR, "gis_osm_railways_free_1.shp"),
    "substations":         os.path.join(DATA_DIR, "substations.shp"),
    "transmission_lines":  os.path.join(DATA_DIR, "trasmission_line.shp"),
    "gas_lines":           os.path.join(DATA_DIR, "gas_line.shp"),
    "rivers":              os.path.join(DATA_DIR, "gis_osm_waterways_free_1.shp"),
    "lakes":               os.path.join(DATA_DIR, "gis_osm_water_a_free_1.shp"),
    "industrial_estates":  os.path.join(DATA_DIR, "IndustrialEstates.shp"),
    "protected_areas":     os.path.join(DATA_DIR, "gis_osm_protected_areas_a_free_1.shp"),
    "airports_csv":        os.path.join(DATA_DIR, "gujarat_airports_dataset.csv"),
    "ports_csv":           os.path.join(DATA_DIR, "ports_Gujarat.csv"),
    "dem":                 os.path.join(DATA_DIR, "Gujarat_DEM_Mosaic.tif"),
    "landuse":             os.path.join(DATA_DIR, "gis_osm_landuse_a_free_1.shp"),
    "buildings":           os.path.join(DATA_DIR, "gis_osm_buildings_a_free_1.shp"),
    "places":              os.path.join(DATA_DIR, "gis_osm_places_free_1.shp"),
    "pois":                os.path.join(DATA_DIR, "gis_osm_pois_free_1.shp"),
    "hospitals":           os.path.join(DATA_DIR, "hospitals.shp"),
    "itis":                os.path.join(DATA_DIR, "itis.shp"),
    "banks":               os.path.join(DATA_DIR, "banks.shp"),
    "warehouse":           os.path.join(DATA_DIR, "warehouse.shp"),
    "freight_terminals":   os.path.join(DATA_DIR, "fright_terminals.shp"),
    "emergency_response":  os.path.join(DATA_DIR, "emergency_responce.shp"),
    "literacy_csv":        os.path.join(DATA_DIR, "gujarat_literacy_rate_1961_2011_cleaned.csv"),
    "nfhs5_csv":           os.path.join(DATA_DIR, "nfhs5_gujarat_districts_full_cleaned.csv"),
    "groundwater_csv":     os.path.join(DATA_DIR, "Dynamic_2017_2_0.csv"),
    "weather_csv":         os.path.join(DATA_DIR, "gujarat_33_districts_weather_infra_risk_2020_2024.csv"),
    "pca_xls":             os.path.join(DATA_DIR, "PCA0000_2011_MDDS.xls"),
    "slope":               os.path.join(DATA_DIR, "slope_deg.tif"),  # pre-generated once, see INSTRUCTIONS.md
}

# Trained-artifact paths (the 4 files you downloaded)
MODEL_PATH             = os.path.join(ML_MODELS_DIR, "lightgbm_model.pkl")
NORMALIZATION_STATS_PATH = os.path.join(ML_MODELS_DIR, "normalization_stats.json")
TUNED_WEIGHTS_PATH     = os.path.join(ML_MODELS_DIR, "tuned_weights.json")
LABEL_MAPPING_PATH     = os.path.join(ML_MODELS_DIR, "label_mapping.json")

# --------------------------------------------------------------- CRS ------
METRIC_CRS = "EPSG:32643"
WGS84 = "EPSG:4326"

LOCAL_ROAD_CLASSES = ["residential", "tertiary", "tertiary_link", "unclassified",
                       "secondary", "secondary_link", "living_street"]
HIGHWAY_CLASSES = ["motorway", "motorway_link", "trunk", "trunk_link",
                    "primary", "primary_link"]
RAIL_CLASSES = ["rail"]
PLACE_CLASSES = ["city", "town"]
RIVER_CLASSES = ["river", "stream", "canal"]
LAKE_CLASSES = None

BUILDING_DENSITY_RADIUS_M = 1000
POI_DENSITY_RADIUS_M = 2000
TYPE_DENSITY_RADIUS_M = 5000
CORRIDOR_CITY_RADIUS_M = 5000
CORRIDOR_DEMAND_RADIUS_M = 8000

# *** ACTION REQUIRED — see module docstring. This is only a 2-entry subset. ***
INDUSTRY_TYPE_KEYWORDS = {
    "IT":     ["it", "software", "information technology", "bpo", "electronics"],
    "Cotton": ["cotton", "textile", "ginning", "spinning"],
    # ... paste the remaining 34 entries from your full pipeline config here
}

# Every raw criterion the suitability score / model features are built from.
CRITERIA = [
    "dist_local_road_m", "dist_highway_m", "dist_railway_m", "dist_substation_m",
    "dist_transline_m", "dist_gasline_m", "dist_river_m", "dist_lake_m",
    "dist_indl_estate_m", "dist_airport_m", "dist_port_m", "dist_place_m",
    "poi_density", "building_density", "landuse_favorability",
    "slope_deg", "literacy_rate", "health_infra_index",
    "water_stress_pct", "climate_risk_index",
]

# Distance-type criteria are lower-is-better; everything below is the opposite.
HIGHER_IS_BETTER = {
    "poi_density", "building_density", "landuse_favorability",
    "literacy_rate", "health_infra_index",
}
# Note: dist_* / slope_deg / water_stress_pct / climate_risk_index are lower-is-better by omission.

MAJOR_RIVERS = {"narmada": 0.95, "tapi": 0.85, "sabarmati": 0.85, "mahi": 0.8, "banas": 0.6}
DEFAULT_RIVER_RELIABILITY = 0.3
CONTEXT_BONUS_CAP = 0.5

LANDUSE_FAVORABILITY = {
    "industrial": 1.0, "commercial": 0.8, "retail": 0.6, "quarry": 0.5,
    "farmland": 0.5, "farmyard": 0.5, "grass": 0.4, "meadow": 0.4,
    "scrub": 0.4, "heath": 0.3, "forest": 0.1, "residential": 0.2,
    "cemetery": 0.0, "nature_reserve": 0.0, "military": 0.0, "park": 0.1,
}


def norm_name(s):
    if s is None:
        return None
    try:
        import pandas as pd
        if pd.isna(s):
            return None
    except Exception:
        pass
    return re.sub(r"[^a-z]", "", str(s).lower().strip())


DISTRICT_ALIASES = {
    "kachchh": "kachchh", "kutch": "kachchh",
    "banaskantha": "banaskantha", "banakantha": "banaskantha",
    "sabarkantha": "sabarkantha", "sabakantha": "sabarkantha",
    "panchmahals": "panchmahals", "panchmahal": "panchmahals",
    "dohad": "dahod", "dahod": "dahod",
    "mahesana": "mehsana", "mehsana": "mehsana",
    "thedangs": "dang", "dangs": "dang", "dang": "dang",
    "ahmadabad": "ahmedabad", "ahmedabad": "ahmedabad",
}


def canon_district(s):
    n = norm_name(s)
    return None if n is None else DISTRICT_ALIASES.get(n, n)
