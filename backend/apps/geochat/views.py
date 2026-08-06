from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from apps.geochat.services.chat import chat as run_chat
from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chat_sessions_view(request):
    """
    List all chat sessions for the current authenticated user.
    """
    sessions = ChatSession.objects.filter(user=request.user).order_by('-updated_at')
    serializer = ChatSessionSerializer(sessions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_chat_session_view(request, session_id):
    """
    Delete a specific chat session for the current user.
    """
    try:
        session = ChatSession.objects.get(user=request.user, session_id=session_id)
        session.delete()
        return Response({"message": "Chat session deleted successfully"}, status=status.HTTP_200_OK)
    except ChatSession.DoesNotExist:
        return Response({"error": "Chat session not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def geochat_view(request):
    """
    Send a query to the AI engine, save the conversation in the database, and return the response.
    """
    message = request.data.get("message")
    session_id = request.data.get("session_id")
    title = request.data.get("title", "New Conversation")
    history = request.data.get("history")  # list of dicts: [{'role': 'user', 'content': '...'}]
    node_context = request.data.get("node_context")  # structured node data from Ask About It

    if not message:
        return Response({"error": "message is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    if not session_id:
        return Response({"error": "session_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    # 1. Find or create the ChatSession for this user
    session, created = ChatSession.objects.get_or_create(
        user=request.user,
        session_id=session_id,
        defaults={"title": title}
    )
    
    # Update the title if it was changed (first user message) or update timestamps
    if not created and title and session.title != title:
        session.title = title
        session.save()
    else:
        session.save()

    # 2. Save the user message to ChatMessage
    ChatMessage.objects.create(
        session=session,
        role='user',
        content=message
    )

    # 3. Call the AI chat engine to get the answer/metadata
    try:
        answer, assistant_history, metadata = run_chat(message, history=history, node_context=node_context)
    except Exception as e:
        return Response({"error": f"AI Engine Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # 4. Save the assistant response to ChatMessage
    ChatMessage.objects.create(
        session=session,
        role='assistant',
        content=answer,
        metadata=metadata
    )

    return Response({
        "answer": answer,
        "history": assistant_history,
        "metadata": metadata
    }, status=status.HTTP_200_OK)