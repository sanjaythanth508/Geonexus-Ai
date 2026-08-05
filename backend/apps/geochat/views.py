from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from apps.geochat.services.chat import chat as run_chat


@api_view(["POST"])
@permission_classes([AllowAny])
def geochat_view(request):
    message = request.data.get("message")
    history = request.data.get("history")  # pass back the list your frontend stored, or None for a new chat
    if not message:
        return Response({"error": "message is required"}, status=400)
    answer, history = run_chat(message, history=history)
    return Response({"answer": answer, "history": history})