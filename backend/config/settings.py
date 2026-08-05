import os
from pathlib import Path
import environ
import sys
from datetime import timedelta

# Configure GDAL for Django GIS (using QGIS installation)
GDAL_LIBRARY_PATH = r'C:\Program Files\QGIS 3.44.10\bin\gdal312.dll'
if os.path.exists(GDAL_LIBRARY_PATH):
    os.environ['GDAL_LIBRARY_PATH'] = GDAL_LIBRARY_PATH
    os.environ['PROJ_LIB'] = r'C:\Program Files\QGIS 3.44.10\share\proj'
    try:
        os.add_dll_directory(r'C:\Program Files\QGIS 3.44.10\bin')
    except Exception:
        pass

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize environment variables
env = environ.Env()
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# Fix HuggingFace symlink and redownloading issues on Windows
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_HUB_OFFLINE"] = "1"

# Security
SECRET_KEY = env('SECRET_KEY')
DEBUG = env.bool('DEBUG', default=False)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=[])

import os
from pathlib import Path

GEONEXUS_DATA_DIR = os.environ.get("GEONEXUS_DATA_DIR", "")
LGB_OUT_DIR        = os.environ.get("LGB_OUT_DIR", "")
KB_DIR              = os.environ.get("KB_DIR", "")
GIS_DIR             = os.environ.get("GIS_DIR", "")
STRUCTURED_DIR      = os.environ.get("STRUCTURED_DIR", "")
CHATBOT_DIR         = os.environ.get("CHATBOT_DIR", "")
QWEN_MODEL_NAME     = os.environ.get("QWEN_MODEL_NAME", "Qwen/Qwen3-4B-Instruct-2507")
GEONEXUS_DEVICE     = os.environ.get("GEONEXUS_DEVICE", "cpu")

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',
    'drf_spectacular',
    'django_filters',

    # Custom apps (note the 'apps.' prefix because we moved them)
    'apps.users',
    'apps.api',
    'apps.analysis',
    'apps.recommendations',
    'apps.reports',
    'apps.geochat',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',          # <-- CORS
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database – using standard PostgreSQL (no local GDAL needed)
DATABASES = {
    'default': env.db('DATABASE_URL')
}
# Override engine to use standard PostgreSQL driver (not PostGIS)
DATABASES['default']['ENGINE'] = 'django.db.backends.postgresql'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static & Media files
STATIC_URL = 'static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# CORS – allow React dev server
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
]

# Logging (optional but useful)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}

# --- ML model location -----------------------------------------------
# BASE_DIR is expected to already resolve to the `backend/` folder
# (config/settings.py -> parent.parent). Confirm this matches your file.
ML_MODELS_DIR = BASE_DIR / "apps" / "ml_models"
SUITABILITY_MODEL_PATH = ML_MODELS_DIR / "suitability_lgbm_model.pkl"
GEONEXUS_DATA_DIR = BASE_DIR / "data" / "gis"        
GEONEXUS_ML_MODELS_DIR = BASE_DIR / "apps" / "ml_models"

if not SUITABILITY_MODEL_PATH.exists():
    import warnings
    warnings.warn(f"Suitability model not found at {SUITABILITY_MODEL_PATH}")
    
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]