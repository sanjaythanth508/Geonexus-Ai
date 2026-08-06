import apiClient from "./client";

/**
 * Must exactly match backend/apps/recommendations/services/weights.py
 * -> INDUSTRY_PROFILES keys. No auto-sync between backend and frontend —
 * update both places if you add/rename an industry.
 */
export const INDUSTRY_OPTIONS = [
  { value: "warehousing_logistics", label: "Warehousing / Logistics" },
  { value: "general_manufacturing", label: "General Manufacturing" },
  { value: "chemical_hazardous", label: "Chemical / Hazardous" },
  { value: "it_electronics", label: "IT / Electronics" },
  { value: "food_processing", label: "Food Processing" },
];

/**
 * Calls POST /api/analysis/score/ and returns the AnalysisRun response.
 * Assumes apiClient (from ./client) already has baseURL configured and,
 * if your endpoint requires auth, an Authorization header interceptor.
 */
export async function scoreLocation({ lat, lon, industry }) {
  try {
    const response = await apiClient.post("analysis/score/", { lat, lon, industry });
    return response.data;
  } catch (err) {
    if (err.response?.data?.error) {
      throw new Error(err.response.data.error);
    }
    if (err.response?.data) {
      const firstField = Object.keys(err.response.data)[0];
      const firstMsg = err.response.data[firstField];
      throw new Error(`${firstField}: ${Array.isArray(firstMsg) ? firstMsg[0] : firstMsg}`);
    }
    throw new Error("Could not reach the scoring service. Is the Django server running?");
  }
}

export async function getIndustryTypes() {
  try {
    const res = await apiClient.get("analysis/industry-types/");
    return res.data.industry_types; // string[]
  } catch (err) {
    console.warn("Industry types API failed, falling back to local defaults.", err);
    return INDUSTRY_OPTIONS.map((item) => item.value);
  }
}

export async function predictSite({ latitude, longitude, industryType }) {
  const res = await apiClient.post("analysis/predict/", {
    latitude,
    longitude,
    industry_type: industryType,
  });
  return res.data;
}

export async function findSuggestion({ latitude, longitude, industryType, currentScore }) {
  const res = await apiClient.post("analysis/find-suggestion/", {
    latitude,
    longitude,
    industry_type: industryType,
    current_score: currentScore,
  });
  return res.data.suggestion;
}