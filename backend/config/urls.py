from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('apps.users.urls')),
    path('users/', include('apps.users.urls')),
    path('api/', include('apps.api.urls')),
    path('api/analysis/', include('apps.analysis.urls')),
    path('api/recommendations/', include('apps.recommendations.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/geochat/', include('apps.geochat.urls')),
]