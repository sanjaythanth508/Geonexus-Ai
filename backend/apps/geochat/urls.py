from django.urls import path
from apps.geochat.views import geochat_view

urlpatterns = [
    path("geochat/", geochat_view, name="geochat"),
]