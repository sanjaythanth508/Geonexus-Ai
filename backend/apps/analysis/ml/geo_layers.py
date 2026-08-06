"""
Loads every shapefile / raster / district CSV exactly once per process and
keeps them in memory. This replaces the Colab cells that read from Google
Drive at the top of the notebook.

Call `get_layers()` anywhere you need them — it's a lazy singleton, so the
(slow, ~seconds-to-a-minute depending on data size) load only happens once,
on first use, not on every prediction request.

For a real deployment, prefer warming this at process start (see
apps.py -> AnalysisConfig.ready() in this same folder's parent) so the
*first* user request isn't the one that pays the load cost.
"""
import os
import threading
import warnings
import numpy as np
import pandas as pd
import geopandas as gpd
from scipy.spatial import cKDTree

from . import config as C

_lock = threading.Lock()
_layers = None  # module-level cache


def _read_vector_light(path, name, columns=None, fclass_filter=None, fclass_col="fclass"):
    if not os.path.exists(path):
        print(f"[GeoNexus][WARN] {name}: not found at {path} -- skipped.")
        return None

    try:
        read_cols = columns
        if fclass_filter is not None and read_cols is not None and fclass_col not in read_cols:
            read_cols = list(read_cols) + [fclass_col]

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            gdf = gpd.read_file(path, engine="pyogrio", columns=read_cols) if read_cols else gpd.read_file(path)
    except KeyboardInterrupt:
        raise
    except Exception as e:
        print(f"[GeoNexus][WARN] {name}: failed to read ({e}) -- skipped.")
        return None

    if gdf is None or len(gdf) == 0:
        return None
    if fclass_filter is not None and fclass_col in gdf.columns:
        gdf = gdf[gdf[fclass_col].isin(fclass_filter)]
    if gdf.crs is None:
        gdf = gdf.set_crs(C.WGS84)
    try:
        return gdf.to_crs(C.METRIC_CRS)
    except Exception as e:
        print(f"[GeoNexus][WARN] {name}: CRS conversion failed ({e}) -- skipped.")
        return None


def _read_csv_points(path, name, lat_col="latitude", lon_col="longitude"):
    if not os.path.exists(path):
        print(f"[GeoNexus][WARN] {name}: not found at {path} -- skipped.")
        return None
    df = pd.read_csv(path)
    gdf = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df[lon_col], df[lat_col]), crs=C.WGS84)
    return gdf.to_crs(C.METRIC_CRS)


def _build_district_table():
    """Ported verbatim from the notebook's district-level tabular merge cell."""
    boundary = _read_vector_light(C.PATHS["boundary"], "boundary")
    if boundary is None or "NAME_2" not in boundary.columns:
        print("[GeoNexus][WARN] boundary shapefile missing or malformed — district table will be empty.")
        return None, pd.DataFrame(columns=["district_key"])
    boundary = boundary.copy()
    boundary["district_key"] = boundary["NAME_2"].apply(C.canon_district)

    district_table = pd.DataFrame({"district_key": boundary["district_key"].unique()})

    if os.path.exists(C.PATHS["literacy_csv"]):
        literacy = pd.read_csv(C.PATHS["literacy_csv"])
        literacy["district_key"] = literacy["District"].apply(C.canon_district)
        lit_col = "2011 - Total Literacy Rate"
        if lit_col in literacy.columns:
            lit_small = literacy[["district_key", lit_col]].rename(
                columns={lit_col: "literacy_rate"}).drop_duplicates("district_key")
            district_table = district_table.merge(lit_small, on="district_key", how="left")
    if "literacy_rate" not in district_table.columns:
        district_table["literacy_rate"] = np.nan

    if os.path.exists(C.PATHS["nfhs5_csv"]):
        nfhs5 = pd.read_csv(C.PATHS["nfhs5_csv"])
        nfhs5 = nfhs5.copy()
        nfhs5["district_key"] = nfhs5["District"].apply(C.canon_district)
        import re
        health_cols = [c for c in nfhs5.columns if re.search(
            r"electricity|sanitation|clean fuel|health insurance|institutional births", c, re.I)]
        if health_cols:
            health_values = nfhs5[health_cols].apply(pd.to_numeric, errors="coerce")
            nfhs5["health_infra_index"] = health_values.mean(axis=1)
            nfhs5_small = nfhs5[["district_key", "health_infra_index"]].drop_duplicates("district_key")
            district_table = district_table.merge(nfhs5_small, on="district_key", how="left")
    if "health_infra_index" not in district_table.columns:
        district_table["health_infra_index"] = np.nan

    if os.path.exists(C.PATHS["groundwater_csv"]):
        gw = pd.read_csv(C.PATHS["groundwater_csv"])
        gw_guj = gw[gw["Name of State"].astype(str).str.upper().str.strip() == "GUJARAT"].copy()
        gw_guj["district_key"] = gw_guj["Name of District"].apply(C.canon_district)
        stress_col = "Stage of Ground Water Extraction (%)"
        if stress_col in gw_guj.columns:
            gw_small = gw_guj[["district_key", stress_col]].rename(
                columns={stress_col: "water_stress_pct"}).drop_duplicates("district_key")
            district_table = district_table.merge(gw_small, on="district_key", how="left")
    if "water_stress_pct" not in district_table.columns:
        district_table["water_stress_pct"] = np.nan

    if os.path.exists(C.PATHS["weather_csv"]):
        weather = pd.read_csv(C.PATHS["weather_csv"])
        weather["district_key"] = weather["district"].apply(C.canon_district)
        weather["is_extreme_heat_day"] = weather["temperature_2m_max"] > 40
        heat_days = weather.groupby("district_key")["is_extreme_heat_day"].mean() * 100
        precip_volatility = weather.groupby("district_key")["precipitation_sum"].std()
        max_wind = weather.groupby("district_key")["windgusts_10m_max"].mean()
        climate_raw = pd.DataFrame({
            "extreme_heat_pct": heat_days,
            "precip_volatility": precip_volatility,
            "mean_max_windgust": max_wind,
        }).reset_index()
        for c in ["extreme_heat_pct", "precip_volatility", "mean_max_windgust"]:
            lo, hi = climate_raw[c].min(), climate_raw[c].max()
            climate_raw[c + "_norm"] = 0.0 if hi == lo else (climate_raw[c] - lo) / (hi - lo) * 100
        climate_raw["climate_risk_index"] = climate_raw[[c + "_norm" for c in
            ["extreme_heat_pct", "precip_volatility", "mean_max_windgust"]]].mean(axis=1)
        district_table = district_table.merge(
            climate_raw[["district_key", "climate_risk_index"]], on="district_key", how="left")
    if "climate_risk_index" not in district_table.columns:
        district_table["climate_risk_index"] = np.nan

    return boundary, district_table


class GeoLayers:
    """Container for every layer + a couple of pre-built spatial indexes."""

    def __init__(self):
        boundary, district_table = _build_district_table()
        self.boundary = boundary
        self.district_table = district_table if district_table is not None else pd.DataFrame(columns=["district_key"])

        # Load roads once and split in-memory
        roads = _read_vector_light(C.PATHS["roads"], "roads", columns=["fclass", "ref", "geometry"])
        if roads is not None:
            self.local_roads = roads[roads["fclass"].isin(C.LOCAL_ROAD_CLASSES)].copy()
            self.highways = roads[roads["fclass"].isin(C.HIGHWAY_CLASSES)].copy()
        else:
            self.local_roads = None
            self.highways = None

        self.railways = _read_vector_light(C.PATHS["railways"], "railways", columns=["geometry"], fclass_filter=C.RAIL_CLASSES)
        self.substations = _read_vector_light(C.PATHS["substations"], "substations", columns=["geometry"])
        self.translines = _read_vector_light(C.PATHS["transmission_lines"], "transmission_lines", columns=["geometry"])
        self.gaslines = _read_vector_light(C.PATHS["gas_lines"], "gas_lines", columns=["geometry"])
        self.rivers = _read_vector_light(C.PATHS["rivers"], "rivers", columns=["name", "geometry"], fclass_filter=C.RIVER_CLASSES)
        self.lakes = _read_vector_light(C.PATHS["lakes"], "lakes", columns=["geometry"])
        self.indl_est = _read_vector_light(C.PATHS["industrial_estates"], "industrial_estates", columns=["geometry"])
        self.landuse = _read_vector_light(C.PATHS["landuse"], "landuse", columns=["fclass", "geometry"])
        self.places = _read_vector_light(C.PATHS["places"], "places", columns=["geometry"], fclass_filter=C.PLACE_CLASSES)
        self.pois = _read_vector_light(C.PATHS["pois"], "pois", columns=["geometry"])
        self.buildings = _read_vector_light(C.PATHS["buildings"], "buildings", columns=["geometry"])
        self.hospitals = _read_vector_light(C.PATHS["hospitals"], "hospitals", columns=["geometry"])
        self.itis = _read_vector_light(C.PATHS["itis"], "itis", columns=["geometry"])
        self.banks = _read_vector_light(C.PATHS["banks"], "banks", columns=["geometry"])
        self.warehouse = _read_vector_light(C.PATHS["warehouse"], "warehouse", columns=["geometry"])
        self.freight = _read_vector_light(C.PATHS["freight_terminals"], "freight_terminals", columns=["geometry"])
        self.emergency = _read_vector_light(C.PATHS["emergency_response"], "emergency_response", columns=["geometry"])

        self.airports = _read_csv_points(C.PATHS["airports_csv"], "airports")
        self.ports = _read_csv_points(C.PATHS["ports_csv"], "ports")

        self.industries = _read_vector_light(C.PATHS["industries"], "industries", columns=["ind_type", "geometry"])
        if self.industries is not None and self.boundary is not None and "district_key" in self.boundary.columns:
            try:
                self.industries = gpd.sjoin(
                    self.industries, self.boundary[["district_key", "geometry"]],
                    how="left", predicate="within",
                ).drop(columns=["index_right"])
                if "district_key_left" in self.industries.columns:
                    self.industries = self.industries.rename(columns={"district_key_left": "district_key"})
            except Exception as exc:
                print(f"[GeoNexus][WARN] industries join failed ({exc}) -- continuing without district join.")

        # distance layers used generically for extra criteria (ITIs, banks, etc.)
        self.ml_distance_layers = {
            "dist_hospital_m": self.hospitals,
            "dist_iti_m": self.itis,
            "dist_bank_m": self.banks,
            "dist_warehouse_m": self.warehouse,
            "dist_freight_m": self.freight,
            "dist_emergency_m": self.emergency,
        }

        # spatial indexes for density_within()
        self.poi_tree = self._build_tree(self.pois)
        self.bld_tree = self._build_tree(self.buildings)

        # per-industry-type matched industry points + a highway/place corridor
        # lookup, both used by predictor.corridor_demand_bonus(). See
        # config.py docstring — INDUSTRY_TYPE_KEYWORDS must be complete for
        # this to be correct for all 36 types.
        self.matched_trees = self._build_matched_trees()
        self.corridor_lookup = self._build_corridor_lookup()

    @staticmethod
    def _build_tree(gdf):
        if gdf is None or len(gdf) == 0:
            return None
        try:
            # Vectorized centroid calculation is orders of magnitude faster
            valid_geoms = gdf.geometry[gdf.geometry.notna() & ~gdf.geometry.is_empty]
            if len(valid_geoms) == 0:
                return None
            centroids = valid_geoms.centroid
            points = np.column_stack((centroids.x, centroids.y))
            return cKDTree(points)
        except Exception as e:
            print(f"[GeoNexus][WARN] Vectorized KDTree build failed ({e}) -- falling back to loop.")
            points = []
            for geom in gdf.geometry:
                if geom is None or getattr(geom, "is_empty", False):
                    continue
                try:
                    centroid = geom.centroid
                    if centroid is None or getattr(centroid, "is_empty", False):
                        continue
                    points.append((centroid.x, centroid.y))
                except Exception:
                    continue
            if not points:
                return None
            return cKDTree(np.array(points))

    def _match_industry_type(self, keywords):
        """Ported from match_industry_type() in the notebook — matches on the
        `ind_type` column via a regex OR of the keywords, not `name`."""
        import re
        pattern = "|".join(re.escape(k) for k in keywords)
        mask = self.industries["ind_type"].astype(str).str.lower().str.contains(
            pattern, na=False, regex=True)
        return self.industries[mask]

    def _build_matched_trees(self):
        """type_name -> (cKDTree, n_matched), exactly like MATCHED_TREES in the notebook."""
        trees = {}
        if self.industries is None or "ind_type" not in getattr(self.industries, "columns", []):
            return trees
        for type_name, keywords in C.INDUSTRY_TYPE_KEYWORDS.items():
            matched = self._match_industry_type(keywords)
            if len(matched) > 0:
                coords = np.array([(g.x, g.y) for g in matched.geometry])
                trees[type_name] = (cKDTree(coords), len(matched))
        return trees

    def _build_corridor_lookup(self):
        """ref_primary -> GeoDataFrame subset of `places` near that highway,
        ported from build_corridor_demand_lookup() in the notebook."""
        lookup = {}
        if self.highways is None or self.places is None or "ref" not in self.highways.columns:
            return lookup
        hw = self.highways.dropna(subset=["ref"]).copy()
        hw["ref_primary"] = hw["ref"].astype(str).str.split(";").str[0].str.strip()
        place_coords = np.array([(g.x, g.y) for g in self.places.geometry])
        if len(place_coords) == 0:
            return lookup
        place_tree = cKDTree(place_coords)

        for ref_code, group in hw.groupby("ref_primary"):
            try:
                union_geom = group.geometry.unary_union
                if union_geom is None or getattr(union_geom, "is_empty", False):
                    continue
                if union_geom.geom_type == "LineString":
                    sample_pts = [union_geom.interpolate(d) for d in np.linspace(0, union_geom.length, 20)]
                else:
                    sample_pts = []
                    for g in getattr(union_geom, "geoms", []):
                        if g is None or getattr(g, "is_empty", False):
                            continue
                        sample_pts.extend(g.interpolate(d) for d in np.linspace(0, g.length, 5))
                if not sample_pts:
                    continue
                sample_coords = np.array([(p.x, p.y) for p in sample_pts if p is not None and not getattr(p, "is_empty", False)])
                if len(sample_coords) == 0:
                    continue
                nearby_idx = set()
                for pt in sample_coords:
                    nearby_idx.update(place_tree.query_ball_point(pt, r=C.CORRIDOR_CITY_RADIUS_M))
                lookup[ref_code] = self.places.iloc[list(nearby_idx)] if nearby_idx else self.places.iloc[[]]
            except Exception:
                continue
        return lookup


def get_layers() -> GeoLayers:
    """Lazy singleton — first call loads everything, later calls are free."""
    global _layers
    if _layers is None:
        with _lock:
            if _layers is None:
                _layers = GeoLayers()
    return _layers


def reload_layers():
    """Call this (e.g. from a management command) after you refresh /data/gis on disk."""
    global _layers
    with _lock:
        _layers = GeoLayers()
    return _layers
