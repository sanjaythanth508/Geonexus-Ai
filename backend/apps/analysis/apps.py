from django.apps import AppConfig
import os


class AnalysisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.analysis'
    
    def ready(self):
        import sys
        is_runserver = "runserver" in sys.argv
        is_child_or_noreload = (os.environ.get("RUN_MAIN") == "true") or ("--noreload" in sys.argv)
        
        if is_runserver and is_child_or_noreload:
            from apps.analysis.ml.geo_layers import get_layers
            from apps.analysis.ml.predictor import get_predictor
            try:
                print("[GeoNexus] Preloading GIS layers and model...")
                get_layers()
                get_predictor()
                print("[GeoNexus] Preloading completed successfully!")
            except FileNotFoundError as e:
                print(f"[GeoNexus] WARNING: prediction pipeline not ready: {e}")