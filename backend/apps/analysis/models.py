from django.conf import settings
from django.db import models


class AnalysisRun(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="analysis_runs",
    )
    latitude = models.FloatField()
    longitude = models.FloatField()
    industry = models.CharField(max_length=64)
    district = models.CharField(max_length=64, null=True, blank=True)

    overall_score = models.FloatField()
    rule_based_score = models.FloatField()
    ml_predicted_score = models.FloatField()

    feature_scores = models.JSONField()
    risk_blockers = models.JSONField(default=list)
    highway_info = models.JSONField(default=dict)
    raw_values = models.JSONField(default=dict)
    
    nearest_highway_ref = models.CharField(max_length=32, null=True, blank=True)
    nearest_river_name = models.CharField(max_length=128, null=True, blank=True)
    highway_corridor_bonus = models.FloatField(default=0.0)
    river_reliability_bonus = models.FloatField(default=0.0)

    mcda_base_score = models.FloatField(default=0.0)                    # 0-100, before context bonuses
    mcda_final_suitability_score = models.FloatField(default=0.0)       # 0-100, final

    lightgbm_predicted_label = models.CharField(max_length=64, default="")
    lightgbm_probabilities = models.JSONField(default=dict)               # {label: probability}
    criteria_breakdown = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["latitude", "longitude"])]

    def __str__(self):
        return f"AnalysisRun({self.latitude}, {self.longitude}, {self.industry}) = {self.overall_score}"