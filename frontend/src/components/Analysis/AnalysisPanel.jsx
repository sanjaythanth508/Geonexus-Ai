import { useEffect, useState } from "react";
import { getIndustryTypes, predictSite } from "../../api/analysis";

/**
 * Controlled by the parent (Dashboard): receives the currently selected
 * map location as a prop, and reports the completed analysis result back
 * up via onResult so ResultsPanel (a sibling) can render it.
 */
export default function AnalysisPanel({ location, onResult }) {
  const latitude = location?.lat;
  const longitude = location?.lon;
  const [industryTypes, setIndustryTypes] = useState([]);
  const [industryType, setIndustryType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getIndustryTypes()
      .then((types) => {
        setIndustryTypes(types);
        setIndustryType((prev) => prev || types[0] || "");
      })
      .catch(() => setError("Could not load industry types."));
  }, []);

  const canSubmit = latitude != null && longitude != null && industryType && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await predictSite({ latitude, longitude, industryType });
      onResult?.(result); // pass the result up to wherever ResultsPanel lives
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Analysis failed. Check the location and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Run Suitability Analysis</h3>

      {!latitude && !longitude && (
        <p className="text-sm text-gray-500 mb-3">
          Click a location on the map to begin.
        </p>
      )}
<form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div>
        <label className="block text-sm font-medium mb-1">Industry type</label>
        <select
          value={industryType}
          onChange={(e) => setIndustryType(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          {industryTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="text-sm text-gray-600">
        {latitude != null && longitude != null
          ? `Selected: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          : "Click a location on the map first."}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
      >
        {loading ? "Analyzing..." : "Run Analysis"}
      </button>
    </form>
    </div>
  );
}