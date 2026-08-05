"""
Loads the LightGBM model saved from Colab exactly once per process
(module-level cache — Django keeps this module alive for the life of the
worker, so this avoids re-reading the .pkl from disk on every request).
"""

import logging
import joblib
from django.conf import settings

logger = logging.getLogger(__name__)

_model_cache = None


def get_model():
    global _model_cache
    if _model_cache is None:
        model_path = settings.SUITABILITY_MODEL_PATH
        if not model_path.exists():
            raise FileNotFoundError(
                f"Suitability model not found at {model_path}. "
                f"Confirm suitability_lgbm_model.pkl was placed in apps/ml_models/."
            )
        logger.info("Loading suitability model from %s", model_path)
        _model_cache = joblib.load(model_path)
    return _model_cache