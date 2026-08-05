import requests
from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer
from .models import UserProfile

class RegisterView(generics.CreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Update profile if extra details were provided during registration
        profile, _ = UserProfile.objects.get_or_create(user=user)
        full_name = request.data.get('full_name', '')
        if full_name:
            profile.full_name = full_name
        phone = request.data.get('phone', '')
        if phone:
            profile.phone = phone
        organization = request.data.get('organization', '')
        if organization:
            profile.organization = organization
        job_title = request.data.get('job_title', '')
        if job_title:
            profile.job_title = job_title
        location = request.data.get('location', '')
        if location:
            profile.location = location
        bio = request.data.get('bio', '')
        if bio:
            profile.bio = bio
        avatar_url = request.data.get('avatar_url', '')
        if avatar_url:
            profile.avatar_url = avatar_url

        profile.is_profile_complete = True
        profile.save()

        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
            "message": "User registered successfully"
        }, status=status.HTTP_201_CREATED)


class GoogleLoginView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

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
        picture = user_data.get('picture', '')
        full_name = user_data.get('name', f"{first_name} {last_name}".strip())
        
        if not email:
            return Response({'error': 'Email not provided by Google'}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Check if user already exists
        user = User.objects.filter(email=email).first()
        is_new_user = False

        if not user:
            # Check by username as well
            user = User.objects.filter(username=email).first()

        if not user:
            is_new_user = True
            user = User.objects.create_user(
                username=email,
                email=email,
                first_name=first_name,
                last_name=last_name
            )
        else:
            # Always ensure first_name, last_name, email are updated from Google token
            if first_name and not user.first_name:
                user.first_name = first_name
            if last_name and not user.last_name:
                user.last_name = last_name
            if email and not user.email:
                user.email = email
            user.save()

        # Populate and sync profile from Google data
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.auth_provider = 'google'
        if picture:
            profile.avatar_url = picture
        if full_name:
            profile.full_name = full_name
        profile.save()
        
        # 3. Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'is_new_user': is_new_user,
            'google_info': {
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
                'full_name': full_name,
                'avatar_url': picture
            },
            'message': "Logged in successfully via Google"
        }, status=status.HTTP_200_OK)


class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Update user standard fields
        if 'email' in request.data:
            instance.email = request.data['email']
        if 'first_name' in request.data:
            instance.first_name = request.data['first_name']
        if 'last_name' in request.data:
            instance.last_name = request.data['last_name']
        instance.save()

        # Update profile fields
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        
        profile_fields = ['full_name', 'bio', 'phone', 'organization', 'job_title', 'location', 'avatar_url']
        for field in profile_fields:
            if field in request.data:
                setattr(profile, field, request.data[field])

        profile.is_profile_complete = True
        profile.save()

        serializer = self.get_serializer(instance)
        return Response(serializer.data)