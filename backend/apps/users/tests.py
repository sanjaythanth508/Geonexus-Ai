from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase
from rest_framework import status
from .models import EmailVerification

User = get_user_model()

class UserValidationAndOTPTests(APITestCase):
    def setUp(self):
        self.register_url = reverse('register')
        self.send_otp_url = reverse('send_otp')
        self.verify_otp_url = reverse('verify_otp')
        self.profile_url = reverse('user-profile')

    def test_field_validations(self):
        # Create a verified OTP verification record for the email used in these validation checks
        EmailVerification.objects.create(email='john@example.com', otp='123456', is_verified=True)

        # 1. Invalid username (too short)
        payload = {
            'username': 'jo',
            'email': 'john@example.com',
            'password': 'Password123!',
            'full_name': 'John Doe'
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

        # 2. Invalid full name (contains number)
        payload = {
            'username': 'john_doe',
            'email': 'john@example.com',
            'password': 'Password123!',
            'full_name': 'John123 Doe'
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('full_name', response.data or response.data.get('profile', {}))

        # 3. Weak password (no special char)
        payload = {
            'username': 'john_doe',
            'email': 'john@example.com',
            'password': 'Password123',
            'full_name': 'John Doe'
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_otp_flow_and_registration(self):
        email = 'newuser@example.com'
        
        # 1. Registration fails without verifying OTP
        payload = {
            'username': 'newuser',
            'email': email,
            'password': 'Password123!',
            'full_name': 'New User'
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

        # 2. Send OTP code
        response = self.client.post(self.send_otp_url, {'email': email})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify it was saved in DB
        verification = EmailVerification.objects.filter(email=email).first()
        self.assertIsNotNone(verification)
        self.assertFalse(verification.is_verified)
        otp = verification.otp

        # 3. Verify OTP with incorrect code
        response = self.client.post(self.verify_otp_url, {'email': email, 'otp': '000000'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Verify OTP with correct code
        response = self.client.post(self.verify_otp_url, {'email': email, 'otp': otp})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        verification.refresh_from_db()
        self.assertTrue(verification.is_verified)

        # 5. Registration succeeds with verified OTP
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        
        # Verification record should be cleaned up/deleted
        self.assertFalse(EmailVerification.objects.filter(email=email).exists())

    def test_profile_email_update_not_allowed(self):
        # Create a user
        user = User.objects.create_user(username='testuser', email='test@example.com', password='Password123!')
        
        # Authenticate
        self.client.force_authenticate(user=user)
        
        # Try to change email address
        payload = {
            'email': 'newemail@example.com',
            'full_name': 'Test User'
        }
        response = self.client.put(self.profile_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Email address cannot be changed')
        
        # Verify email remained unchanged
        user.refresh_from_db()
        self.assertEqual(user.email, 'test@example.com')
        
        # Try to change other fields while keeping same email
        payload_same_email = {
            'email': 'test@example.com',
            'full_name': 'Updated Test User'
        }
        response = self.client.put(self.profile_url, payload_same_email, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify full name updated but email remained same
        user.refresh_from_db()
        self.assertEqual(user.profile.full_name, 'Updated Test User')
        self.assertEqual(user.email, 'test@example.com')

