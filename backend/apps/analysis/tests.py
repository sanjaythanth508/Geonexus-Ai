from unittest.mock import patch

import geopandas as gpd
import shapely.geometry as geom
from django.test import SimpleTestCase
from django.urls import reverse

from apps.analysis.ml.geo_layers import GeoLayers
from apps.analysis.services import scorer


class ScorerCompatibilityTests(SimpleTestCase):
    @patch("apps.analysis.services.scorer.run_and_save_analysis")
    def test_score_and_save_wraps_legacy_signature(self, mock_run_and_save_analysis):
        mock_run_and_save_analysis.return_value = object()

        result = scorer.score_and_save(
            lat=12.34,
            lon=56.78,
            industry="manufacturing",
            user="demo-user",
            project="demo-project",
        )

        mock_run_and_save_analysis.assert_called_once_with(
            user="demo-user",
            latitude=12.34,
            longitude=56.78,
            industry_type="manufacturing",
            project="demo-project",
        )
        self.assertIs(result, mock_run_and_save_analysis.return_value)


class GeoLayersTests(SimpleTestCase):
    def test_build_tree_skips_empty_geometries(self):
        gdf = gpd.GeoDataFrame(
            {"id": [1, 2, 3]},
            geometry=[geom.Point(0, 0), geom.Point(1, 1), geom.GeometryCollection()],
            crs="EPSG:4326",
        )

        tree = GeoLayers._build_tree(gdf)

        self.assertIsNotNone(tree)


class AnalysisRoutingTests(SimpleTestCase):
    def test_analysis_urls_are_not_double_prefixed(self):
        self.assertEqual(reverse("analysis:predict-site"), "/api/analysis/predict/")
        self.assertEqual(reverse("analysis:industry-types"), "/api/analysis/industry-types/")
