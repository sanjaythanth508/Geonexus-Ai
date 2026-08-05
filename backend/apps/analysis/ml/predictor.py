"""
Faithful port of the notebook's predict_location(lat, lon, industry_type).

Loading: your .pkl was made with joblib.dump(model, ...) on the Booster, so
it's loaded with joblib.load() -- NOT lgb.Booster(model_file=...). Get this
wrong and you'll either get an exception or (worse) a silently-wrong object.
"""
import threading
import numpy as np
import pandas as pd
import geopandas as gpd
import joblib
import json
import os
from shapely.geometry import Point

from . import config as C
from . import feature_engineering as FE
from .geo_layers import get_layers

_lock = threading.Lock()
_predictor = None


class GeoNexusPredictor:
    def __init__(self):
        for p in (C.MODEL_PATH, C.NORMALIZATION_STATS_PATH, C.TUNED_WEIGHTS_PATH, C.LABEL_MAPPING_PATH):
            if not os.path.exists(p):
                raise FileNotFoundError(
                    f"GeoNexus model artifact missing: {p}. "
                    f"Copy your 4 downloaded files into {C.ML_MODELS_DIR}."
                )

        self.model = joblib.load(C.MODEL_PATH)  # joblib-pickled Booster

        with open(C.NORMALIZATION_STATS_PATH) as f:
            raw_stats = json.load(f)
        # stored as {criterion: [lo, hi]} -> tuple form used by feature_engineering
        self.norm_stats = {k: (v[0], v[1]) for k, v in raw_stats.items()}

        with open(C.TUNED_WEIGHTS_PATH) as f:
            self.tuned_weights = json.load(f)

        with open(C.LABEL_MAPPING_PATH) as f:
            label_meta = json.load(f)
        self.label_order = label_meta["label_order"]
        self.label_to_int = label_meta["label_to_int"]
        self.feature_cols = label_meta["feature_cols"]  # exact training column order

        self.model_categorical_categories = []
        pandas_categorical = getattr(self.model, "pandas_categorical", None)
        if isinstance(pandas_categorical, list) and pandas_categorical:
            self.model_categorical_categories = list(pandas_categorical[0])

    def _resolve_industry_weights(self, industry_type: str):
        if not industry_type:
            raise ValueError("industry_type is required")

        if isinstance(self.tuned_weights, dict):
            if industry_type in self.tuned_weights:
                return industry_type, self.tuned_weights[industry_type]

            if "priors" in self.tuned_weights and isinstance(self.tuned_weights["priors"], dict):
                for section_name, section_weights in self.tuned_weights.items():
                    if not isinstance(section_weights, dict):
                        continue
                    if industry_type in section_weights:
                        return industry_type, section_weights[industry_type]

            normalized = str(industry_type).strip().lower()
            for section_name, section_weights in self.tuned_weights.items():
                if not isinstance(section_weights, dict):
                    continue
                for candidate_name, weights in section_weights.items():
                    if str(candidate_name).strip().lower() == normalized:
                        return candidate_name, weights
                    if normalized in str(candidate_name).strip().lower().replace(" & ", " ").replace(",", ""):
                        return candidate_name, weights

        raise ValueError(
            f"Unknown industry_type {industry_type!r}. Known: {self._list_known_industries()}"
        )

    def _list_known_industries(self):
        if not isinstance(self.tuned_weights, dict):
            return []
        industries = []
        for section_name, section_weights in self.tuned_weights.items():
            if isinstance(section_weights, dict):
                industries.extend(section_weights.keys())
        return sorted(set(industries))

    def predict_location(self, lat: float, lon: float, industry_type: str) -> dict:
        resolved_name, weights = self._resolve_industry_weights(industry_type)
        industry_type = resolved_name

        layers = get_layers()

        pt_wgs = gpd.GeoDataFrame(geometry=[Point(lon, lat)], crs=C.WGS84)
        pt = pt_wgs.to_crs(C.METRIC_CRS)
        pt_district = layers.boundary[layers.boundary.geometry.contains(pt.geometry.iloc[0])]
        dkey = pt_district["district_key"].iloc[0] if len(pt_district) > 0 else None
        pt = pt.copy()
        pt["district_key"] = dkey
        pt = pt.merge(layers.district_table, on="district_key", how="left")
        pt = gpd.GeoDataFrame(pt, geometry=gpd.GeoSeries(pt_wgs.to_crs(C.METRIC_CRS).geometry, crs=C.METRIC_CRS))

        raw = FE.compute_raw_features(pt, layers)
        raw["slope_deg"] = FE.sample_raster(pt_wgs, C.PATHS["slope"], "slope_deg")
        for c in ["literacy_rate", "health_infra_index", "water_stress_pct", "climate_risk_index"]:
            raw[c] = pt[c].values

        ctx = FE.compute_context_attrs(pt, layers)
        scores = FE.normalize_benefit_100(raw, C.CRITERIA, ref_stats=self.norm_stats)

        w = weights
        base = FE.weighted_score_0to1(scores, w, C.CRITERIA).iloc[0]
        corridor_bonus = FE.corridor_demand_bonus(
            ctx["nearest_highway_ref"].iloc[0], industry_type, layers)
        river_bonus = FE.river_reliability_bonus(ctx["nearest_river_name"].iloc[0])
        combined_bonus = float(np.clip(
            corridor_bonus + (river_bonus - C.DEFAULT_RIVER_RELIABILITY), 0, C.CONTEXT_BONUS_CAP))
        final_score_100 = float(np.clip(base * (1 + combined_bonus) * 100, 0, 100))

        # Build the model input row using the booster's exact feature names and
        # order. The saved label mapping is a fallback for older artifacts, but
        # the loaded model exposes the true feature schema we must use.
        feature_names = []
        if hasattr(self.model, "feature_name"):
            feature_names = list(self.model.feature_name())
        if not feature_names:
            feature_names = list(self.feature_cols)
            if "industry_type_cat" not in feature_names:
                feature_names.append("industry_type_cat")

        row = {}
        for col in feature_names:
            if col == "industry_type_cat":
                continue
            crit = col[4:] if col.startswith("raw_") else col
            row[col] = [raw[crit].iloc[0]] if crit in raw.columns else [np.nan]

        lgb_row = pd.DataFrame(row, columns=feature_names)
        if "industry_type_cat" in feature_names:
            known_categories = self.model_categorical_categories or self._list_known_industries()
            lgb_row["industry_type_cat"] = pd.Series(
                pd.Categorical([industry_type], categories=known_categories),
                dtype=pd.CategoricalDtype(categories=known_categories),
            )
        lgb_row = lgb_row[feature_names]

        best_iter = getattr(self.model, "best_iteration", None)
        lgb_proba = self.model.predict(lgb_row, num_iteration=best_iter)[0]
        lgb_label = self.label_order[int(np.argmax(lgb_proba))]

        breakdown = {
            c: {
                "raw": float(raw[c].iloc[0]) if pd.notna(raw[c].iloc[0]) else None,
                "score_100": round(float(scores[c + "_score"].iloc[0]), 2),
                "weight": round(w[c] / sum(w.values()), 4),
            }
            for c in C.CRITERIA
        }

        return {
            "latitude": lat,
            "longitude": lon,
            "industry_type": industry_type,
            "district": dkey,
            "nearest_highway_ref": ctx["nearest_highway_ref"].iloc[0],
            "nearest_river_name": ctx["nearest_river_name"].iloc[0],
            "highway_corridor_bonus": round(corridor_bonus, 4),
            "river_reliability_bonus": round(river_bonus, 4),
            "mcda_base_score_100": round(base * 100, 2),
            "mcda_final_suitability_score": round(final_score_100, 2),
            "lightgbm_predicted_label": lgb_label,
            "lightgbm_probabilities": {
                self.label_order[i]: round(float(p), 4) for i, p in enumerate(lgb_proba)
            },
            "criteria_breakdown": breakdown,
        }


def get_predictor() -> GeoNexusPredictor:
    global _predictor
    if _predictor is None:
        with _lock:
            if _predictor is None:
                _predictor = GeoNexusPredictor()
    return _predictor


def predict_ml_score(scores: dict, industry_type: str) -> float:
    return 50.0

