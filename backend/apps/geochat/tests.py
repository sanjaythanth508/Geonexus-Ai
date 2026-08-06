from django.test import TestCase, SimpleTestCase
from rest_framework.test import APIClient
from apps.geochat.services.domain_intelligence import (
    extract_coordinates,
    extract_district,
    extract_all_districts,
    extract_industry_sector,
    classify_query_intent,
    expand_query_for_rag,
    QueryIntent
)
from apps.geochat.services.vector_store import hybrid_retrieve, lexical_search
from apps.geochat.services.explainer import explain_suitability_result, format_explanation_markdown
from apps.geochat.services.comparative_engine import run_comparative_siting_analysis, format_chatgpt_style_comparison_markdown
from apps.geochat.services.chat import chat, ConversationSessionTracker


class DomainIntelligenceTests(SimpleTestCase):
    def test_extract_coordinates_decimal(self):
        text = "Check suitability for location (22.9868, 72.3814)"
        coords = extract_coordinates(text)
        self.assertIsNotNone(coords)
        self.assertEqual(coords, (22.9868, 72.3814))

    def test_extract_coordinates_named_hub(self):
        text = "What is the feasibility of setting up in Sanand?"
        coords = extract_coordinates(text)
        self.assertIsNotNone(coords)
        self.assertEqual(coords, (22.9868, 72.3814))

    def test_extract_district_canonical_and_alias(self):
        self.assertEqual(extract_district("Industrial growth in Ahmedabad"), "Ahmedabad")
        self.assertEqual(extract_district("Requirements for Ankleshwar chemical hub"), "Bharuch")
        self.assertEqual(extract_district("Groundwater in Kachchh"), "Kutch")

    def test_extract_all_districts(self):
        text = "which city is preferable for cotton industry surat or ahemedabad?"
        dists = extract_all_districts(text)
        self.assertEqual(dists, ["Surat", "Ahmedabad"])

    def test_extract_industry_sector(self):
        self.assertEqual(extract_industry_sector("Setting up an API bulk drug manufacturing unit"), "Pharmaceutical")
        self.assertEqual(extract_industry_sector("which city is preferable for cotton industry surat or ahemedabad?"), "Cotton")
        self.assertEqual(extract_industry_sector("Solar farm and green hydrogen plant"), "Renewable Energy")
        self.assertEqual(extract_industry_sector("Cold storage distribution warehouse"), "Warehousing")

    def test_classify_query_intent(self):
        self.assertEqual(classify_query_intent("which city is preferable for cotton industry surat or ahemedabad?"), QueryIntent.LOCATION_COMPARISON)
        self.assertEqual(classify_query_intent("Compare Dahej and Sanand for chemical plant"), QueryIntent.LOCATION_COMPARISON)
        self.assertEqual(classify_query_intent("What is the GPCB CTE clearance process for Red Category?"), QueryIntent.REGULATION_COMPLIANCE)
        self.assertEqual(classify_query_intent("Evaluate suitability score for site 22.98, 72.38"), QueryIntent.SUITABILITY_ASSESSMENT)
        self.assertEqual(classify_query_intent("How far is the nearest national highway?"), QueryIntent.GIS_PROXIMITY)
        self.assertEqual(classify_query_intent("What is the literacy and groundwater in Surat?"), QueryIntent.DISTRICT_INQUIRY)

    def test_expand_query_for_rag(self):
        expansions = expand_query_for_rag("What are the GPCB CTE requirements?")
        self.assertTrue(any("Consent to Establish" in exp for exp in expansions))


class ComparativeEngineTests(SimpleTestCase):
    def test_run_comparative_siting_analysis_cotton(self):
        results = run_comparative_siting_analysis(["Surat", "Ahmedabad"], industry_sector="Cotton")
        self.assertEqual(len(results["locations_evaluated"]), 2)
        self.assertIn("winner", results)
        self.assertIn(results["winner"]["name"], ["Surat", "Ahmedabad"])
        self.assertTrue(results["winner"]["final_score"] > 0)

    def test_format_chatgpt_style_comparison_markdown(self):
        results = run_comparative_siting_analysis(["Surat", "Ahmedabad"], industry_sector="Cotton")
        markdown = format_chatgpt_style_comparison_markdown(results)
        self.assertIn("Comparative Analysis", markdown)
        self.assertIn("Executive Verdict", markdown)
        self.assertIn("Head-to-Head", markdown)
        self.assertIn("Strategic Recommendation", markdown)


class VectorStoreRAGTests(SimpleTestCase):
    def test_lexical_search_returns_relevant_chunks(self):
        results = lexical_search("GPCB CTE Consent to Establish", top_k=3)
        self.assertTrue(len(results) > 0)
        top_idx, top_score = results[0]
        self.assertTrue(isinstance(top_idx, int))
        self.assertTrue(top_score > 0)

    def test_hybrid_retrieve_with_filters(self):
        results = hybrid_retrieve(
            query="Cotton textile spinning mills pollution norms in Gujarat",
            candidate_k=10,
            final_k=2
        )
        self.assertTrue(len(results) > 0)
        self.assertTrue(isinstance(results[0]["text"], str))


class ExplainerTests(SimpleTestCase):
    def test_explain_suitability_result(self):
        mock_suit = {
            "lat": 22.98,
            "lon": 72.38,
            "industry_type": "Chemical",
            "district": "Ahmedabad",
            "final_suitability_score": 78.5,
            "ml_predicted_label": "Good",
            "ml_probabilities": {"Good": 0.85, "Moderate": 0.15},
            "criteria_breakdown": {
                "dist_highway_m": {"raw": 450.0, "score_100": 92.0, "weight": 0.12},
                "dist_substation_m": {"raw": 1200.0, "score_100": 85.0, "weight": 0.10},
                "water_stress_pct": {"raw": 85.0, "score_100": 42.0, "weight": 0.08}
            }
        }
        explanation = explain_suitability_result(mock_suit)
        self.assertEqual(explanation["final_score"], 78.5)
        self.assertEqual(explanation["ml_label"], "Good")
        self.assertTrue(len(explanation["positive_drivers"]) > 0)
        self.assertTrue(len(explanation["negative_drivers"]) > 0)
        self.assertTrue(len(explanation["recommendations"]) > 0)


class GeoChatMultiDomainTests(TestCase):
    def test_cotton_city_comparison_query_end_to_end(self):
        query = "which city is preferable for cotton industry surat or ahemedabad?"
        answer, history, metadata = chat(query)
        self.assertIn("Comparative Analysis", answer)
        self.assertIn("Scorecard", answer)
        self.assertEqual(metadata["intent"], QueryIntent.LOCATION_COMPARISON)
        self.assertIn("Surat", metadata["districts_compared"])
        self.assertIn("Ahmedabad", metadata["districts_compared"])
        self.assertEqual(metadata["industry"], "Cotton")

    def test_ml_prediction_explanation_query(self):
        query = "How does LightGBM predict the suitability score and what is feature importance?"
        answer, history, metadata = chat(query)
        self.assertIn("LightGBM", answer)
        self.assertIn("MCDA", answer)
        self.assertEqual(metadata["intent"], "ML_PREDICTIONS")

    def test_soil_and_geology_query(self):
        query = "What are the soil types and construction suitability in South Gujarat?"
        answer, history, metadata = chat(query)
        self.assertIn("Soil", answer)
        self.assertIn("Bearing Capacity", answer)
        self.assertEqual(metadata["intent"], "SOIL_GEOLOGY")

    def test_water_and_cgwb_query(self):
        query = "Explain groundwater extraction rules and CGWB status in Gujarat"
        answer, history, metadata = chat(query)
        self.assertIn("Water", answer)
        self.assertIn("CGWA", answer)
        self.assertEqual(metadata["intent"], "WATER_RESOURCES")

    def test_remote_sensing_ndvi_query(self):
        query = "What is NDVI and how is it calculated from Sentinel-2?"
        answer, history, metadata = chat(query)
        self.assertIn("NDVI", answer)
        self.assertIn("Sentinel-2", answer)
        self.assertEqual(metadata["intent"], "REMOTE_SENSING")


class GeoChatAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_geochat_comparison_endpoint(self):
        response = self.client.post(
            "/api/geochat/geochat/",
            {"message": "which city is preferable for cotton industry surat or ahemedabad?"},
            format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("answer", response.data)
        self.assertIn("Head-to-Head", response.data["answer"])
        self.assertIn("metadata", response.data)
        self.assertEqual(response.data["metadata"]["intent"], "LOCATION_COMPARISON")

    def test_geochat_soil_endpoint(self):
        response = self.client.post(
            "/api/geochat/geochat/",
            {"message": "What are the soil types and construction suitability in South Gujarat?"},
            format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("answer", response.data)
        self.assertIn("Soil", response.data["answer"])
