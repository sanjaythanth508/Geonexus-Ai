import re
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserProfile

User = get_user_model()

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = (
            'full_name', 'bio', 'phone', 'organization',
            'job_title', 'location', 'avatar_url',
            'auth_provider', 'is_profile_complete'
        )

    def validate_full_name(self, value):
        if value:
            if len(value) < 2:
                raise serializers.ValidationError("Full name must be at least 2 characters long.")
            if not re.match(r"^[a-zA-Z\s\-\']+$", value):
                raise serializers.ValidationError("Full name can only contain letters, spaces, hyphens, and apostrophes.")
        return value

    def validate_phone(self, value):
        if value:
            # Allow digits, spaces, hyphens, parentheses, and optional leading +
            if not re.match(r"^\+?[0-9\s\-()]{7,20}$", value):
                raise serializers.ValidationError("Invalid phone number format. Provide 7 to 20 digits/symbols.")
        return value

    def validate_avatar_url(self, value):
        if value:
            if value.startswith('/media/') or value.startswith('media/'):
                return value
            validator = URLValidator()
            try:
                validator(value)
            except ValidationError:
                raise serializers.ValidationError("Invalid avatar URL format.")
        return value

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        avatar_url = ret.get('avatar_url')
        if avatar_url and not (avatar_url.startswith('http://') or avatar_url.startswith('https://')):
            request = self.context.get('request')
            if request:
                ret['avatar_url'] = request.build_absolute_uri(avatar_url)
        return ret



class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    profile = UserProfileSerializer(required=False)
    
    # Flat profile fields for easy registration payload validation and persistence
    full_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    avatar_url = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name', 'profile', 'full_name', 'phone', 'avatar_url')

    def validate_full_name(self, value):
        if value:
            if len(value) < 2:
                raise serializers.ValidationError("Full name must be at least 2 characters long.")
            if not re.match(r"^[a-zA-Z\s\-\']+$", value):
                raise serializers.ValidationError("Full name can only contain letters, spaces, hyphens, and apostrophes.")
        return value

    def validate_phone(self, value):
        if value:
            if not re.match(r"^\+?[0-9\s\-()]{7,20}$", value):
                raise serializers.ValidationError("Invalid phone number format. Provide 7 to 20 digits/symbols.")
        return value

    def validate_avatar_url(self, value):
        if value:
            if value.startswith('/media/') or value.startswith('media/'):
                return value
            validator = URLValidator()
            try:
                validator(value)
            except ValidationError:
                raise serializers.ValidationError("Invalid avatar URL format.")
        return value

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("Email is required.")
        user_id = self.instance.id if self.instance else None
        email_exists = User.objects.filter(email__iexact=value).exclude(id=user_id).exists()
        if email_exists:
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        if not value:
            raise serializers.ValidationError("Username is required.")
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        if not re.match(r"^[a-zA-Z0-9_\-]+$", value):
            raise serializers.ValidationError("Username can only contain alphanumeric characters, underscores, and hyphens.")
        
        user_id = self.instance.id if self.instance else None
        username_exists = User.objects.filter(username__iexact=value).exclude(id=user_id).exists()
        if username_exists:
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_password(self, value):
        if value:
            if len(value) < 8:
                raise serializers.ValidationError("Password must be at least 8 characters long.")
            if not any(c.isupper() for c in value):
                raise serializers.ValidationError("Password must contain at least one uppercase letter.")
            if not any(c.isdigit() for c in value):
                raise serializers.ValidationError("Password must contain at least one digit.")
            if not any(c in "!@#$%^&*(),.?\":{}|<>" for c in value):
                raise serializers.ValidationError("Password must contain at least one special character.")
        return value

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        full_name = validated_data.pop('full_name', '')
        phone = validated_data.pop('phone', '')
        avatar_url = validated_data.pop('avatar_url', '')
        password = validated_data.pop('password', None)
        
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()

        # Signal will have created user.profile automatically
        profile = getattr(user, 'profile', None)
        if profile:
            if full_name:
                profile.full_name = full_name
            if phone:
                profile.phone = phone
            if avatar_url:
                profile.avatar_url = avatar_url
            for attr, val in profile_data.items():
                setattr(profile, attr, val)
            profile.save()
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        full_name = validated_data.pop('full_name', '')
        phone = validated_data.pop('phone', '')
        avatar_url = validated_data.pop('avatar_url', '')
        password = validated_data.pop('password', None)

        instance.email = validated_data.get('email', instance.email)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        
        if password:
            instance.set_password(password)
        instance.save()

        profile, _ = UserProfile.objects.get_or_create(user=instance)
        if full_name:
            profile.full_name = full_name
        if phone:
            profile.phone = phone
        if avatar_url:
            profile.avatar_url = avatar_url
        for attr, val in profile_data.items():
            setattr(profile, attr, val)
        profile.save()

        return instance

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Handle absolute path mapping for flat avatar_url field in UserSerializer
        avatar_url = ret.get('avatar_url')
        if avatar_url and not (avatar_url.startswith('http://') or avatar_url.startswith('https://')):
            request = self.context.get('request')
            if request:
                ret['avatar_url'] = request.build_absolute_uri(avatar_url)
        return ret