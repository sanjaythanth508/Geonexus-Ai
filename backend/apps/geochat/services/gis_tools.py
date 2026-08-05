import os, glob
import warnings
from django.conf import settings
import geopandas as gpd
from shapely.geometry import Point
from pyproj import Transformer

# Suppress the GeoSeries.notna() warning that appears during server startup
warnings.filterwarnings('ignore', 'GeoSeries.notna', UserWarning)

UTM_CRS = "EPSG:32643"
_to_utm = Transformer.from_crs("EPSG:4326", UTM_CRS, always_xy=True)
_NAME_FIELD_HINTS = ["name", "facility", "road_nm", "river_nm", "label", "title"]

GIS_LAYERS = {}


def _load_layers():
    if GIS_LAYERS:
        return GIS_LAYERS
    for shp_path in glob.glob(f"{settings.GIS_DIR}/*.shp"):
        layer_name = os.path.splitext(os.path.basename(shp_path))[0].strip().lower().replace(" ", "_")
        try:
            gdf = gpd.read_file(shp_path)
            if gdf.crs is None:
                gdf = gdf.set_crs("EPSG:4326")
            gdf = gdf[~gdf.geometry.is_empty & gdf.geometry.notna() & gdf.geometry.is_valid]
            GIS_LAYERS[layer_name] = gdf.to_crs(UTM_CRS)
        except Exception as e:
            print(f"[WARN] failed to load {shp_path}: {e}")
    return GIS_LAYERS


def _find_name_field(gdf):
    cols = list(gdf.columns)
    lower_map = {c.lower(): c for c in cols}
    for hint in _NAME_FIELD_HINTS:
        for lc, orig in lower_map.items():
            if lc == hint:
                return orig
    for hint in _NAME_FIELD_HINTS:
        for lc, orig in lower_map.items():
            if hint in lc:
                return orig
    return None


def get_nearest_feature(lat: float, lon: float, layer_name: str) -> dict:
    layers = _load_layers()
    layer_name = layer_name.strip().lower().replace(" ", "_")
    if not layers:
        return {"error": f"No GIS layers loaded -- add shapefiles to {settings.GIS_DIR}."}
    if layer_name not in layers:
        return {"error": f"Unknown GIS layer {layer_name!r}. Loaded layers: {sorted(layers.keys())}"}

    gdf = layers[layer_name]
    x, y = _to_utm.transform(lon, lat)
    pt = Point(x, y)
    dists = gdf.geometry.distance(pt)
    if dists.isna().all():
        return {"error": f"Layer {layer_name!r} has no valid geometries."}
    nearest_idx = dists.idxmin()
    nearest_row = gdf.loc[nearest_idx]
    name_field = _find_name_field(gdf)

    return {
        "layer": layer_name,
        "queried_lat": lat, "queried_lon": lon,
        "distance_km": round(float(dists.loc[nearest_idx]) / 1000, 3),
        "nearest_feature_name": str(nearest_row[name_field]) if name_field else None,
    }