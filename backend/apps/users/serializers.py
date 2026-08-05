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

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    profile = UserProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name', 'profile')

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
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
            for attr, val in profile_data.items():
                setattr(profile, attr, val)
            profile.save()
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password', None)

        instance.email = validated_data.get('email', instance.email)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        
        if password:
            instance.set_password(password)
        instance.save()

        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for attr, val in profile_data.items():
            setattr(profile, attr, val)
        profile.save()

        return instance