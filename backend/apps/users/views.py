import requests
import random
import re
import os
import uuid
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer
from .models import UserProfile, EmailVerification


class SendOTPView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if email is valid format
        if not re.match(r"^[\w\.\+\-]+\@[\w\.\-]+\.[\w]{2,}$", email):
            return Response({'error': 'Invalid email address format'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check if email already registered
        if User.objects.filter(email__iexact=email).exists():
            return Response({'error': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Generate 6-digit code
        otp = f"{random.randint(100000, 999999)}"
        
        # Save OTP to Database (upsert)
        verification, created = EmailVerification.objects.update_or_create(
            email=email.lower(),
            defaults={'otp': otp, 'is_verified': False, 'created_at': timezone.now()}
        )
        
        # Send Email
        subject = "Verify your GeoNexus AI Account"
        message = f"Your GeoNexus AI account verification code is: {otp}\nThis code is valid for 10 minutes."
        from_email = None # Will use DEFAULT_FROM_EMAIL from settings
        
        # Professional HTML email layout
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Verify your GeoNexus AI Account</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0e1a; color: #ffffff; padding: 40px 20px; margin: 0; text-align: center;">
            <div style="max-width: 500px; margin: 0 auto; background: rgba(16, 22, 42, 0.95); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 40px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
                <!-- Logo / Branding -->
                <div style="margin-bottom: 25px;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.03em; background: linear-gradient(135deg, #8B5CF6, #3B82F6, #22D3EE); -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: #22D3EE; display: inline-block;">
                        GeoNexus AI
                    </h1>
                    <p style="margin: 5px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #94A3B8; font-weight: 700;">
                        Intelligent Industrial Site Selection
                    </p>
                </div>
                
                <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 20px 0;">
                
                <!-- Main Message -->
                <h2 style="font-size: 18px; font-weight: 700; color: #F1F5F9; margin-top: 0; margin-bottom: 12px;">
                    Confirm Your Registration
                </h2>
                <p style="font-size: 14px; color: #94A3B8; line-height: 1.6; margin-bottom: 25px; text-align: left;">
                    Welcome to the operator desk! To finalize setting up your account and start exploring site suitability models, please use the 6-digit confirmation code below:
                </p>
                
                <!-- Verification Code Container -->
                <div style="background: rgba(34, 211, 238, 0.05); border: 1px dashed rgba(34, 211, 238, 0.35); border-radius: 8px; padding: 18px 10px; margin-bottom: 25px;">
                    <span style="font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #22D3EE; font-family: 'Courier New', Courier, monospace;">
                        {otp}
                    </span>
                </div>
                
                <p style="font-size: 12px; color: #64748B; margin-bottom: 20px; text-align: left; line-height: 1.5;">
                    Security Note: This verification key is strictly valid for the next <strong>10 minutes</strong>. Please do not forward or share this code with anyone.
                </p>
                
                <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 20px 0;">
                
                <!-- Footer -->
                <p style="font-size: 11px; color: #475569; margin: 0; line-height: 1.5; text-align: center;">
                    This is an automated security transmission from GeoNexus AI. Replies to this email address are not monitored.
                </p>
            </div>
        </body>
        </html>
        """
        
        try:
            send_mail(subject, message, from_email, [email], html_message=html_message)
        except Exception as e:
            print(f"Error sending email: {e}")
            return Response({'error': f'Failed to send verification email. Details: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response({'message': 'Verification code sent successfully.'}, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        otp = request.data.get('otp')
        
        if not email or not otp:
            return Response({'error': 'Email and verification code are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        ten_minutes_ago = timezone.now() - timedelta(minutes=10)
        verification = EmailVerification.objects.filter(
            email__iexact=email,
            otp=otp,
            created_at__gte=ten_minutes_ago
        ).first()
        
        if not verification:
            return Response({'error': 'Invalid or expired verification code.'}, status=status.HTTP_400_BAD_REQUEST)
            
        verification.is_verified = True
        verification.save()
        
        return Response({'message': 'Email verified successfully.'}, status=status.HTTP_200_OK)


class SendResetOTPView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if email is valid format
        if not re.match(r"^[\w\.\+\-]+\@[\w\.\-]+\.[\w]{2,}$", email):
            return Response({'error': 'Invalid email address format'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check if email already registered (IT MUST EXIST FOR RESET)
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'error': 'No user found with this email address.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Generate 6-digit code
        otp = f"{random.randint(100000, 999999)}"
        
        # Save OTP to Database (upsert)
        verification, created = EmailVerification.objects.update_or_create(
            email=email.lower(),
            defaults={'otp': otp, 'is_verified': False, 'created_at': timezone.now()}
        )
        
        # Send Email
        subject = "Reset your GeoNexus AI Password"
        from_email = None
        
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Reset your GeoNexus AI Password</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0e1a; color: #ffffff; padding: 40px 20px; margin: 0; text-align: center;">
            <div style="max-width: 500px; margin: 0 auto; background: rgba(16, 22, 42, 0.95); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 40px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
                <div style="margin-bottom: 25px;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.03em; background: linear-gradient(135deg, #8B5CF6, #3B82F6, #22D3EE); -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: #22D3EE; display: inline-block;">
                        GeoNexus AI
                    </h1>
                </div>
                
                <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 20px 0;">
                
                <h2 style="font-size: 18px; font-weight: 700; color: #F1F5F9; margin-top: 0; margin-bottom: 12px;">
                    Password Reset Request
                </h2>
                <p style="font-size: 14px; color: #94A3B8; line-height: 1.6; margin-bottom: 25px; text-align: left;">
                    We received a request to reset the password for your GeoNexus AI account. Please use the 6-digit confirmation code below to proceed:
                </p>
                
                <div style="background: rgba(34, 211, 238, 0.05); border: 1px dashed rgba(34, 211, 238, 0.35); border-radius: 8px; padding: 18px 10px; margin-bottom: 25px;">
                    <span style="font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #22D3EE; font-family: 'Courier New', Courier, monospace;">
                        {otp}
                    </span>
                </div>
                
                <p style="font-size: 12px; color: #64748B; margin-bottom: 20px; text-align: left; line-height: 1.5;">
                    Security Note: This verification key is strictly valid for the next <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email.
                </p>
            </div>
        </body>
        </html>
        """
        
        try:
            send_mail(subject, "", from_email, [email], html_message=html_message)
        except Exception as e:
            print(f"Error sending email: {e}")
            return Response({'error': f'Failed to send reset email. Details: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response({'message': 'Reset code sent successfully.'}, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        new_password = request.data.get('new_password')
        
        if not email or not new_password:
            return Response({'error': 'Email and new password are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Verify that the email was verified within the last 10 minutes
        ten_minutes_ago = timezone.now() - timedelta(minutes=10)
        verification = EmailVerification.objects.filter(
            email__iexact=email,
            is_verified=True,
            created_at__gte=ten_minutes_ago
        ).first()
        
        if not verification:
            return Response({'error': 'Email verification required or expired. Send and verify a code first.'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'error': 'No user found with this email address.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Update the password
        user.set_password(new_password)
        user.save()
        
        # Delete verification record to prevent reuse
        verification.delete()
        
        return Response({'message': 'Password reset successfully.'}, status=status.HTTP_200_OK)


class RegisterView(generics.CreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # Enforce email OTP verification for standard local registrations
        verification = None
        if 'password' in request.data:
            email = request.data.get('email')
            if not email:
                return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            ten_minutes_ago = timezone.now() - timedelta(minutes=10)
            verification = EmailVerification.objects.filter(
                email__iexact=email, 
                is_verified=True, 
                created_at__gte=ten_minutes_ago
            ).first()
            
            if not verification:
                return Response({'error': 'Email verification required. Send and verify a code first.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Now that validation is successful, delete the OTP verification record
        if verification:
            verification.delete()

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
            if request.data['email'] != instance.email:
                return Response({'error': 'Email address cannot be changed'}, status=status.HTTP_400_BAD_REQUEST)
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


class AvatarUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        if 'avatar' not in request.FILES:
            return Response({'error': 'No image file provided under "avatar"'}, status=status.HTTP_400_BAD_REQUEST)
        
        avatar_file = request.FILES['avatar']
        
        # Simple extension check
        ext = os.path.splitext(avatar_file.name)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
            return Response({'error': 'Unsupported file type. Only JPG, PNG, GIF, and WEBP are allowed.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Max size check (5MB)
        if avatar_file.size > 5 * 1024 * 1024:
            return Response({'error': 'File size exceeds maximum limit of 5MB.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Create media avatars folder if it doesn't exist
        avatars_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
        os.makedirs(avatars_dir, exist_ok=True)
        
        # Create unique filename
        filename = f"user_{request.user.id}_{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(avatars_dir, filename)
        
        # Save file chunks to media storage
        with open(filepath, 'wb+') as destination:
            for chunk in avatar_file.chunks():
                destination.write(chunk)
                
        # Save avatar URL relative path to user profile
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        avatar_url = f"{settings.MEDIA_URL}avatars/{filename}"
        profile.avatar_url = avatar_url
        profile.save()
        
        return Response({
            'message': 'Avatar uploaded successfully',
            'avatar_url': request.build_absolute_uri(avatar_url)
        }, status=status.HTTP_200_OK)