"""
Ported from the notebook's compute_raw_features / compute_context_attrs /
normalize_benefit_100 / corridor_demand_bonus / river_reliability_bonus.

Difference from the notebook: normalize_benefit_100 here is ALWAYS called
with ref_stats=NORM_STATS (loaded from your saved normalization_stats.json)
-- we never recompute min/max from a fresh grid, since there is no grid at
inference time. This matches exactly what predict_location() did in the
notebook (it also always passed ref_stats=NORM_STATS).
"""
import numpy as np
import pandas as pd
import geopandas as gpd

from . import config as C


def nearest_distance(points_gdf, target_gdf, colname):
    if target_gdf is None or len(target_gdf) == 0:
        return pd.Series(np.nan, index=points_gdf.index, name=colname)
    joined = gpd.sjoin_nearest(points_gdf[["geometry"]], target_gdf[["geometry"]],
                                distance_col=colname, how="left")
    joined = joined[~joined.index.duplicated(keep="first")]
    return joined[colname].reindex(points_gdf.index)


def nearest_attr(points_gdf, target_gdf, attr_col, out_col):
    if target_gdf is None or len(target_gdf) == 0 or attr_col not in target_gdf.columns:
        return pd.Series(None, index=points_gdf.index, name=out_col)
    joined = gpd.sjoin_nearest(points_gdf[["geometry"]], target_gdf[[attr_col, "geometry"]], how="left")
    joined = joined[~joined.index.duplicated(keep="first")]
    return joined[attr_col].reindex(points_gdf.index)


def density_within(points_gdf, target_tree, radius_m):
    if target_tree is None:
        return pd.Series(np.nan, index=points_gdf.index)
    coords = np.array([(g.x, g.y) for g in points_gdf.geometry])
    return pd.Series(target_tree.query_ball_point(coords, r=radius_m, return_length=True),
                      index=points_gdf.index)


def compute_raw_features(points_gdf, layers):
    f = pd.DataFrame(index=points_gdf.index)
    f["dist_local_road_m"] = nearest_distance(points_gdf, layers.local_roads, "dist_local_road_m")
    f["dist_highway_m"] = nearest_distance(points_gdf, layers.highways, "dist_highway_m")
    f["dist_railway_m"] = nearest_distance(points_gdf, layers.railways, "dist_railway_m")
    f["dist_substation_m"] = nearest_distance(points_gdf, layers.substations, "dist_substation_m")
    f["dist_transline_m"] = nearest_distance(points_gdf, layers.translines, "dist_transline_m")
    f["dist_gasline_m"] = nearest_distance(points_gdf, layers.gaslines, "dist_gasline_m")
    f["dist_river_m"] = nearest_distance(points_gdf, layers.rivers, "dist_river_m")
    f["dist_lake_m"] = nearest_distance(points_gdf, layers.lakes, "dist_lake_m")
    f["dist_indl_estate_m"] = nearest_distance(points_gdf, layers.indl_est, "dist_indl_estate_m")
    f["dist_airport_m"] = nearest_distance(points_gdf, layers.airports, "dist_airport_m")
    f["dist_port_m"] = nearest_distance(points_gdf, layers.ports, "dist_port_m")
    f["dist_place_m"] = nearest_distance(points_gdf, layers.places, "dist_place_m")
    f["poi_density"] = density_within(points_gdf, layers.poi_tree, C.POI_DENSITY_RADIUS_M)
    f["building_density"] = density_within(points_gdf, layers.bld_tree, C.BUILDING_DENSITY_RADIUS_M)
    for col, layer in layers.ml_distance_layers.items():
        f[col] = nearest_distance(points_gdf, layer, col)

    if layers.landuse is not None and len(layers.landuse) > 0:
        lu = nearest_attr(points_gdf, layers.landuse, "fclass", "landuse_fclass")
        f["landuse_fclass"] = lu
        f["landuse_favorability"] = lu.map(C.LANDUSE_FAVORABILITY).fillna(0.3)
    else:
        f["landuse_fclass"] = None
        f["landuse_favorability"] = np.nan

    return f


def compute_context_attrs(points_gdf, layers):
    ctx = pd.DataFrame(index=points_gdf.index)
    ctx["nearest_highway_ref"] = nearest_attr(points_gdf, layers.highways, "ref", "nearest_highway_ref")
    ctx["nearest_river_name"] = nearest_attr(points_gdf, layers.rivers, "name", "nearest_river_name")
    return ctx


def normalize_benefit_100(df, cols, ref_stats):
    """Always called with the saved NORM_STATS at inference time — never
    recomputed from a single point, which would be meaningless."""
    norm = pd.DataFrame(index=df.index)
    for c in cols:
        col = df[c]
        lo, hi = ref_stats.get(c, (0.0, 1.0))
        if lo is None or hi is None or hi == lo:
            norm[c + "_score"] = 50.0
            continue
        scaled = (col - lo) / (hi - lo)
        scaled = scaled if c in C.HIGHER_IS_BETTER else 1 - scaled
        norm[c + "_score"] = (scaled.clip(0, 1) * 100).fillna(0)
    return norm


def weighted_score_0to1(score_df, weight_vector, criteria):
    w = np.array([weight_vector[c] for c in criteria])
    w = w / w.sum()
    vals = score_df[[c + "_score" for c in criteria]].fillna(0).values / 100.0
    return pd.Series((vals * w).sum(axis=1), index=score_df.index)


def corridor_demand_bonus(ref_code, type_name, layers):
    if ref_code is None or ref_code not in layers.corridor_lookup or type_name not in layers.matched_trees:
        return 0.0
    corridor_places = layers.corridor_lookup[ref_code]
    if len(corridor_places) == 0:
        return 0.0
    tree, n_matched = layers.matched_trees[type_name]
    place_coords = np.array([(g.x, g.y) for g in corridor_places.geometry])
    counts = tree.query_ball_point(place_coords, r=C.CORRIDOR_DEMAND_RADIUS_M, return_length=True)
    return float(min(1.0, counts.sum() / max(1, n_matched)))


def river_reliability_bonus(river_name):
    if river_name is None or (isinstance(river_name, float) and np.isnan(river_name)):
        return C.DEFAULT_RIVER_RELIABILITY
    key = C.norm_name(river_name)
    for river, score in C.MAJOR_RIVERS.items():
        if river in (key or ""):
            return score
    return C.DEFAULT_RIVER_RELIABILITY


def sample_raster(points_gdf_wgs84, raster_path, colname):
    import os
    import rasterio
    from rasterio.sample import sample_gen
    if not os.path.exists(raster_path):
        return pd.Series(np.nan, index=points_gdf_wgs84.index, name=colname)
    with rasterio.open(raster_path) as src:
        coords = [(g.x, g.y) for g in points_gdf_wgs84.geometry]
        vals = [v[0] if v[0] != src.nodata else np.nan for v in sample_gen(src, coords)]
    return pd.Series(vals, index=points_gdf_wgs84.index, name=colname)
