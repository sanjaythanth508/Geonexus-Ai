# users/views.py
import requests
from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer

class RegisterView(generics.CreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            "user": UserSerializer(user).data,
            "message": "User created successfully"
        })


# GoogleLoginView 
class GoogleLoginView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny] # Anyone should be able to attempt a login

    def post(self, request, *args, **kwargs):
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 1. Verify the token with Google
        
        google_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
        response = requests.get(google_url)
        
        if response.status_code != 200:
            return Response({'error': 'Invalid Google token'}, status=status.HTTP_400_BAD_REQUEST)
            
        user_data = response.json()
        email = user_data.get('email')
        first_name = user_data.get('given_name', '')
        last_name = user_data.get('family_name', '')
        
        # 2. Get existing user or register them on the fly
        user, created = User.objects.get_or_create(
            username=email, # Using email as username to ensure uniqueness
            defaults={
                'email': email,
                'first_name': first_name,
                'last_name': last_name
            }
        )
        
        # 3. Generate JWT tokens for React session management
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data, # Reuses your existing serializer!
            'message': "Logged in successfully via Google"
        }, status=status.HTTP_200_OK)