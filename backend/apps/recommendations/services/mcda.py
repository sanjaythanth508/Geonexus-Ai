"""
Pure, DB-free scoring math: normalization functions and the weighted
composite. Takes raw values in, returns 0-1 (or 0-100) scores out.
Nothing here touches the database or the ML model — that separation is
what keeps this logic independently testable.
"""

import math
from .weights import CRITERIA, INDUSTRY_PROFILES, FAVOURABLE_LANDUSE, UNFAVOURABLE_LANDUSE, SENSITIVE_NATURAL


def exponential_decay(distance_km, decay_km=5.0):
    if distance_km is None:
        return 0.5  # unknown -> neutral, never treat missing data as "far"
    return math.exp(-distance_km / decay_km)


def inverse_risk(is_inside, distance_km=None, buffer_km=2.0):
    if is_inside:
        return 0.0
    if distance_km is None:
        return 1.0
    if distance_km >= buffer_km:
        return 1.0
    return round(distance_km / buffer_km, 4)


def minmax(value, min_val, max_val):
    if value is None:
        return 0.5
    if max_val == min_val:
        return 0.5
    return max(0.0, min(1.0, (value - min_val) / (max_val - min_val)))


def normalize_features(raw: dict) -> tuple[dict, list[str]]:
    """Raw extracted values -> {criterion: 0-1 score}, plus any hard blockers."""
    scores = {}
    blockers = []

    scores["road"] = exponential_decay(raw.get("road_distance_km"), decay_km=3)
    scores["highway_connectivity"] = raw.get("highway_connectivity_info", {}).get("connectivity_score", 0.5)
    scores["railway"] = exponential_decay(raw.get("railway_distance_km"), decay_km=8)
    scores["transport"] = exponential_decay(raw.get("transport_distance_km"), decay_km=3)
    scores["water"] = exponential_decay(raw.get("water_distance_km"), decay_km=5)
    scores["hospital"] = exponential_decay(raw.get("hospital_distance_km"), decay_km=10)

    proximity_component = exponential_decay(raw.get("nearest_place_distance_km"), decay_km=15)
    pop_val = raw.get("nearest_place_population")
    size_component = minmax(math.log(pop_val) if pop_val else None, math.log(1_000), math.log(2_000_000))
    scores["population"] = round(0.6 * proximity_component + 0.4 * size_component, 4)

    scores["building_density"] = minmax(raw.get("buildings_within_2km"), 0, 500)

    lu = raw.get("landuse_class")
    if lu in FAVOURABLE_LANDUSE:
        scores["landuse"] = 0.9
    elif lu in UNFAVOURABLE_LANDUSE:
        scores["landuse"] = 0.25
    elif lu is None:
        scores["landuse"] = 0.5
    else:
        scores["landuse"] = 0.6

    if raw.get("inside_protected_area"):
        scores["protected_area"] = 0.0
        blockers.append("Site is inside a protected/conservation area — regulatory clearance required.")
    else:
        scores["protected_area"] = inverse_risk(False, raw.get("protected_area_distance_km"), buffer_km=2.0)

    nat = raw.get("natural_class")
    if nat in SENSITIVE_NATURAL:
        scores["natural_risk"] = 0.3
    elif nat is None:
        scores["natural_risk"] = 1.0
    else:
        scores["natural_risk"] = 0.7

    return scores, blockers


def rule_based_composite(scores: dict, industry: str) -> float:
    if industry not in INDUSTRY_PROFILES:
        raise ValueError(f"Unknown industry '{industry}'. Options: {list(INDUSTRY_PROFILES)}")
    weights = INDUSTRY_PROFILES[industry]
    return round(sum(scores[k] * weights[k] for k in CRITERIA) * 100, 2)