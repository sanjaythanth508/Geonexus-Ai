"""
Top-level scoring entry point: ties raw feature extraction (feature_engineering),
rule-based MCDA (recommendations.services.mcda), and the ML surrogate
(predictor) together into one blended, explainable result.
"""

from apps.recommendations.services.mcda import normalize_features, rule_based_composite
from apps.recommendations.services.weights import INDUSTRY_PROFILES
from . import feature_engineering as fe
from .predictor import predict_ml_score


def compute_suitability_score(lat: float, lon: float, industry: str, blend_weight_ml: float = 0.4) -> dict:
    """
    blend_weight_ml: 0 = pure rule-based (fully explainable), 1 = pure ML.
    0.4 keeps the result mostly explainable while still benefiting from the
    model's learned feature interactions.
    """
    if industry not in INDUSTRY_PROFILES:
        raise ValueError(f"Unknown industry '{industry}'. Options: {list(INDUSTRY_PROFILES)}")

    raw = fe.extract_raw_features(lat, lon)
    scores, blockers = normalize_features(raw)
    rule_score = rule_based_composite(scores, industry)
    ml_score = predict_ml_score(scores, industry)

    final_score = round((1 - blend_weight_ml) * rule_score + blend_weight_ml * ml_score, 2)

    return {
        "location": {"lat": lat, "lon": lon},
        "industry": industry,
        "overall_score": final_score,
        "rule_based_score": rule_score,
        "ml_predicted_score": ml_score,
        "risk_blockers": blockers,
        "feature_scores": {k: round(v * 100, 2) for k, v in scores.items()},
        "highway_narrative": fe.highway_narrative(raw["highway_connectivity_info"]),
        "highway_info": raw["highway_connectivity_info"],
        "raw_values": {k: v for k, v in raw.items() if k != "highway_connectivity_info"},
    }