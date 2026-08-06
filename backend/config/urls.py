from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

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

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)