from django.contrib import admin
from .models import AnalysisRun


@admin.register(AnalysisRun)
class AnalysisRunAdmin(admin.ModelAdmin):
    list_display = ("id", "latitude", "longitude", "industry", "overall_score", "created_at")
    list_filter = ("industry", "created_at")
    readonly_fields = [f.name for f in AnalysisRun._meta.fields]