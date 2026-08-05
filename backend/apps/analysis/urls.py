from django.urls import path
from .views import ScoreLocationView
from . import views

app_name = "analysis"

urlpatterns = [
    path("score/", ScoreLocationView.as_view(), name="score-location"),
    path("predict/", views.predict_site, name="predict-site"),
    path("industry-types/", views.list_industry_types, name="industry-types"),
]