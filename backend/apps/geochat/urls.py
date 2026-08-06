from django.urls import path
from apps.geochat.views import geochat_view, chat_sessions_view, delete_chat_session_view

urlpatterns = [
    path("geochat/", geochat_view, name="geochat"),
    path("sessions/", chat_sessions_view, name="chat_sessions"),
    path("sessions/<str:session_id>/", delete_chat_session_view, name="delete_chat_session"),
]