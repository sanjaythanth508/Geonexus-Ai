from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=255, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    phone = models.CharField(max_length=30, blank=True, default='')
    organization = models.CharField(max_length=255, blank=True, default='')
    job_title = models.CharField(max_length=150, blank=True, default='')
    location = models.CharField(max_length=255, blank=True, default='')
    avatar_url = models.URLField(max_length=500, blank=True, default='')
    auth_provider = models.CharField(max_length=50, default='local') # 'google' or 'local'
    is_profile_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.username}"

@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()


class EmailVerification(models.Model):
    email = models.EmailField(unique=True)
    otp = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"OTP verification for {self.email}"

