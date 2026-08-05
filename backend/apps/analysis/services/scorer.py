"""
Django-facing entry point. Views call run_and_save_analysis(); nothing else
in the app should import ml.predictor directly.
"""
from apps.analysis.ml.predictor import get_predictor
from apps.analysis.models import AnalysisRun


def run_and_save_analysis(*, user, latitude: float, longitude: float, industry_type: str,
                           project=None) -> AnalysisRun:
    predictor = get_predictor()
    result = predictor.predict_location(latitude, longitude, industry_type)

    probs = result["lightgbm_probabilities"]
    ml_score = (
        probs.get("Poor", 0.0) * 10.0 +
        probs.get("Moderate", 0.0) * 45.0 +
        probs.get("Good", 0.0) * 75.0 +
        probs.get("Excellent", 0.0) * 95.0
    )

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

