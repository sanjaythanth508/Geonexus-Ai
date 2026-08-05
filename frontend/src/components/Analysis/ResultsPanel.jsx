export default function ResultsPanel({ result }) {
  if (!result) return null;

  const {
    district,
    industry_type,
    mcda_final_suitability_score,
    lightgbm_predicted_label,
    lightgbm_probabilities,
    highway_corridor_bonus,
    river_reliability_bonus,
    nearest_highway_ref,
    nearest_river_name,
    criteria_breakdown,
  } = result;

  const topCriteria = Object.entries(criteria_breakdown || {})
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 8);

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-sm text-gray-500">{district || "Unknown district"} · {industry_type}</div>
        <div className="text-3xl font-semibold">{mcda_final_suitability_score.toFixed(1)} / 100</div>
        <div className="text-sm text-gray-600">
          Model prediction: <span className="font-medium">{lightgbm_predicted_label}</span>
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-1">Model confidence</div>
        {Object.entries(lightgbm_probabilities || {})
          .sort((a, b) => b[1] - a[1])
          .map(([label, prob]) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <span className="w-24 truncate">{label}</span>
              <div className="flex-1 bg-gray-100 rounded h-2">
                <div className="bg-blue-500 h-2 rounded" style={{ width: `${prob * 100}%` }} />
              </div>
              <span className="w-12 text-right">{(prob * 100).toFixed(0)}%</span>
            </div>
          ))}
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <div>Nearest highway: {nearest_highway_ref || "—"} (corridor bonus {(highway_corridor_bonus * 100).toFixed(0)}%)</div>
        <div>Nearest river: {nearest_river_name || "—"} (reliability {(river_reliability_bonus * 100).toFixed(0)}%)</div>
      </div>

      <div>
        <div className="text-sm font-medium mb-1">Top-weighted criteria</div>
        <table className="w-full text-sm">
          <tbody>
            {topCriteria.map(([crit, v]) => (
              <tr key={crit} className="border-t">
                <td className="py-1">{crit}</td>
                <td className="py-1 text-right">{v.score_100.toFixed(0)}/100</td>
                <td className="py-1 text-right text-gray-500 w-16">
                  {(v.weight * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
