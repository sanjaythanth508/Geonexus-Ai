from django.urls import path
from .views import ScoreLocationView
from . import views

app_name = "analysis"

urlpatterns = [
    path("score/", ScoreLocationView.as_view(), name="score-location"),
    path("predict/", views.predict_site, name="predict-site"),
    path("find-suggestion/", views.find_suggestion, name="find-suggestion"),
    path("industry-types/", views.list_industry_types, name="industry-types"),
]