from rest_framework import serializers
from apps.analysis.ml.predictor import get_predictor
from .models import AnalysisRun


class AnalysisRequestSerializer(serializers.Serializer):
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lon = serializers.FloatField(min_value=-180, max_value=180)
    industry = serializers.CharField()

    def validate_industry(self, value):
        predictor = get_predictor()
        try:
            predictor._resolve_industry_weights(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return value


class AnalysisRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisRun
        fields = [
            "id", "latitude", "longitude", "industry",
            "overall_score", "rule_based_score", "ml_predicted_score",
            "feature_scores", "risk_blockers", "highway_info", "raw_values",
            "created_at",
        ]