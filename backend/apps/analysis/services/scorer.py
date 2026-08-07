"""
Django-facing entry point. Views call run_and_save_analysis(); nothing else
in the app should import ml.predictor directly.
"""
from apps.analysis.ml.predictor import get_predictor
from apps.analysis.models import AnalysisRun
from apps.analysis.ml import config as ML_CONFIG
import pandas as pd
import math

INDUSTRY_TYPES = list(ML_CONFIG.INDUSTRY_TYPE_KEYWORDS.keys())

def sanitize_nan(obj):
    if isinstance(obj, dict):
        return {k: sanitize_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_nan(v) for v in obj]
    elif pd.isna(obj):
        return None
    return obj

def get_coordinates_at_distance(lat, lon, distance_km, bearing_deg):
    lat_rad = math.radians(lat)
    km_per_lat_deg = 111.32
    km_per_lon_deg = 111.32 * math.cos(lat_rad)
    
    bearing_rad = math.radians(bearing_deg)
    d_lat = (distance_km * math.cos(bearing_rad)) / km_per_lat_deg
    d_lon = (distance_km * math.sin(bearing_rad)) / km_per_lon_deg
    
    return lat + d_lat, lon + d_lon

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def find_better_nearby_location_ondemand(latitude: float, longitude: float, industry_type: str, current_score: float) -> dict:
    try:
        predictor = get_predictor()
    except Exception as e:
        print(f"[GeoNexus] Error loading predictor: {e}")
        return None
        
    best_score = current_score
    best_res = None
    seen = set()

    def eval_coord(clat, clon):
        nonlocal best_score, best_res
        if clat is None or clon is None or math.isnan(clat) or math.isnan(clon):
            return None
        d = haversine_km(latitude, longitude, clat, clon)
        if d < 0.2 or d > 20.0:
            return None
        key = (round(clat, 4), round(clon, 4))
        if key in seen:
            return None
        seen.add(key)

        try:
            res = predictor.predict_location(clat, clon, industry_type)
            if res and res.get("district") and "error" not in res:
                sc = res["mcda_final_suitability_score"]
                if sc > best_score:
                    best_score = sc
                    best_res = res
                    return res
        except Exception:
            pass
        return None

    # =========================================================================
    # STEP 1 (FIRST PRIORITY): Check GIDC / Industrial Estates (IndustrialEstates.shp)
    # =========================================================================
    try:
        from apps.analysis.ml.geo_layers import get_layers
        layers = get_layers()
        if hasattr(layers, "indl_est") and layers.indl_est is not None and len(layers.indl_est) > 0:
            estates_wgs = layers.indl_est.to_crs("EPSG:4326")
            
            # Find all GIDCs within 20km first
            valid_estates = []
            for geom in estates_wgs.geometry:
                if geom is not None and not geom.is_empty:
                    centroid = geom.centroid
                    d = haversine_km(latitude, longitude, centroid.y, centroid.x)
                    if d <= 20.0:
                        valid_estates.append((d, centroid.y, centroid.x))
            
            if len(valid_estates) > 0:
                # Sort by distance so we check closest ones first
                valid_estates.sort()
                
                # Evaluate the top 8 closest GIDCs to optimize speed & coverage
                for d, cy, cx in valid_estates[:8]:
                    eval_coord(cy, cx)
    except Exception as e:
        print(f"[GeoNexus] Note: GIDC/Industrial Estates search error: {e}")

    # If GIDC search yielded a better score, return it immediately
    if best_res and best_score > current_score:
        return sanitize_nan(best_res)

    # =========================================================================
    # STEP 2: Gradient Climb Search (Only run if GIDC search did not improve score)
    # =========================================================================
    # Start climbing from original coordinates in 8 directions up to 20km
    current_lat = latitude
    current_lon = longitude
    step_size_km = 4.0
    directions = [0, 45, 90, 135, 180, 225, 270, 315]

    for iteration in range(3):
        improved = False
        best_step_lat = current_lat
        best_step_lon = current_lon

        for deg in directions:
            plat, plon = get_coordinates_at_distance(current_lat, current_lon, step_size_km, deg)
            
            # Distance constraint check from the starting location
            if haversine_km(latitude, longitude, plat, plon) <= 20.0:
                res = eval_coord(plat, plon)
                if res:
                    best_step_lat = plat
                    best_step_lon = plon
                    improved = True

        if improved:
            # Move the center of the search to the newly discovered better location
            current_lat = best_step_lat
            current_lon = best_step_lon
        else:
            # Reduce step size to narrow down the search when stuck
            step_size_km /= 2.0
            if step_size_km < 1.0:
                break

    if best_res and best_score > current_score:
        return sanitize_nan(best_res)
    return None

def get_suitability(lat: float, lon: float, industry_type: str) -> dict:
    try:
        predictor = get_predictor()
        res = predictor.predict_location(lat, lon, industry_type)
        res = sanitize_nan(res)
        # map to the keys that chat.py expects
        return {
            "latitude": res["latitude"],
            "longitude": res["longitude"],
            "industry_type": res["industry_type"],
            "district": res.get("district"),
            "final_suitability_score": res["mcda_final_suitability_score"],
            "ml_predicted_label": res["lightgbm_predicted_label"],
            "ml_probabilities": res["lightgbm_probabilities"],
            "criteria_breakdown": res["criteria_breakdown"]
        }
    except Exception as e:
        return {"error": str(e)}

def run_and_save_analysis(*, user, latitude: float, longitude: float, industry_type: str,
                           project=None) -> AnalysisRun:
    predictor = get_predictor()
    result = predictor.predict_location(latitude, longitude, industry_type)
    result = sanitize_nan(result)

    probs = result["lightgbm_probabilities"]
    ml_score = (
        probs.get("Poor", 0.0) * 10.0 +
        probs.get("Moderate", 0.0) * 45.0 +
        probs.get("Good", 0.0) * 75.0 +
        probs.get("Excellent", 0.0) * 95.0
    )

    # Initial analysis runs fast; suggestions are triggered on-demand by user
    run = AnalysisRun.objects.create(
        user=user,
        latitude=result["latitude"],
        longitude=result["longitude"],
        industry=result["industry_type"],
        district=result["district"],
        overall_score=result["mcda_final_suitability_score"],
        rule_based_score=result["mcda_base_score_100"],
        ml_predicted_score=round(ml_score, 2),
        feature_scores={c: data["score_100"] for c, data in result["criteria_breakdown"].items()},
        raw_values={c: data["raw"] for c, data in result["criteria_breakdown"].items()},
        risk_blockers=[],
        highway_info={"nearest_highway_ref": result["nearest_highway_ref"], "highway_corridor_bonus": result["highway_corridor_bonus"]},
        nearest_highway_ref=result["nearest_highway_ref"],
        nearest_river_name=result["nearest_river_name"],
        highway_corridor_bonus=result["highway_corridor_bonus"],
        river_reliability_bonus=result["river_reliability_bonus"],
        mcda_base_score=result["mcda_base_score_100"],
        mcda_final_suitability_score=result["mcda_final_suitability_score"],
        lightgbm_predicted_label=result["lightgbm_predicted_label"],
        lightgbm_probabilities=result["lightgbm_probabilities"],
        criteria_breakdown=result["criteria_breakdown"],
        better_site_suggestion=None,
    )
    return run


def score_and_save(*, lat: float, lon: float, industry: str, user=None, project=None):
    return run_and_save_analysis(
        user=user,
        latitude=lat,
        longitude=lon,
        industry_type=industry,
        project=project,
    )

