import { useNavigate } from 'react-router-dom';

export default function ResultsPanel({ result }) {
  const navigate = useNavigate();
  if (!result) return null;

  const {
    district,
    industry_type,
    mcda_final_suitability_score,
    lightgbm_predicted_label,
    highway_corridor_bonus,
    river_reliability_bonus,
    nearest_highway_ref,
    nearest_river_name,
  } = result;

  const scoreNum = Number(mcda_final_suitability_score) || 0;
  
  // Single-word site classification
  let categoryLabel = "Moderate";
  let categoryColor = "#22D3EE"; // Cyan
  let categoryBg = "rgba(34, 211, 238, 0.12)";
  let categoryBorder = "rgba(34, 211, 238, 0.3)";

  if (scoreNum >= 75 || lightgbm_predicted_label.toLowerCase().includes('high') || lightgbm_predicted_label.toLowerCase().includes('excellent')) {
    categoryLabel = "Excellent";
    categoryColor = "#10B981"; // Green
    categoryBg = "rgba(16, 185, 129, 0.12)";
    categoryBorder = "rgba(16, 185, 129, 0.3)";
  } else if (scoreNum >= 50 || lightgbm_predicted_label.toLowerCase().includes('moderate') || lightgbm_predicted_label.toLowerCase().includes('good')) {
    categoryLabel = "Good";
    categoryColor = "#22D3EE"; // Cyan
    categoryBg = "rgba(34, 211, 238, 0.12)";
    categoryBorder = "rgba(34, 211, 238, 0.3)";
  } else {
    categoryLabel = "Poor";
    categoryColor = "#EF4444"; // Red
    categoryBg = "rgba(239, 68, 68, 0.12)";
    categoryBorder = "rgba(239, 68, 68, 0.3)";
  }

  const handleOpenReport = () => {
    navigate('/report', { state: { result } });
  };

  return (
    <div style={{
      padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
      background: 'var(--glass-bg)', borderRadius: 'var(--r-lg)',
      border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)',
    }} className="anim-fadeIn">
      
      {/* Header & Score */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {district || "Gujarat Region"} · {industry_type}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
          <div style={{ fontSize: '36px', fontWeight: '900', fontFamily: 'var(--font-display)', color: 'var(--cyan)', lineHeight: 1 }}>
            {scoreNum.toFixed(1)} <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '600' }}>/100</span>
          </div>
        </div>
      </div>

      {/* Single-word Site Classification Pill */}
      <div style={{
        padding: '14px', borderRadius: 'var(--r-md)',
        background: categoryBg, border: `1px solid ${categoryBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '800', color: categoryColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Site Classification
          </div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: categoryColor, marginTop: '2px' }}>
            {categoryLabel}
          </div>
        </div>
        <div style={{
          width: '12px', height: '12px', borderRadius: '50%', background: categoryColor,
          boxShadow: `0 0 10px ${categoryColor}`
        }} />
      </div>

      {/* Corridors Overview */}
      <div style={{
        padding: '12px', borderRadius: 'var(--r-sm)',
        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)',
        fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)'
      }}>
        <div>📍 <strong>Highway:</strong> {nearest_highway_ref || "NH Corridor"} <span style={{ color: 'var(--emerald)', fontWeight: '700' }}>(+{(highway_corridor_bonus * 100).toFixed(0)}%)</span></div>
        <div>🌊 <strong>Water Access:</strong> {nearest_river_name || "Regional Water"} <span style={{ color: 'var(--purple)', fontWeight: '700' }}>({(river_reliability_bonus * 100).toFixed(0)}%)</span></div>
      </div>

      {/* Action to Full PDF Page Report */}
      <button
        onClick={handleOpenReport}
        className="btn-primary"
        style={{ width: '100%', padding: '12px', fontSize: '13px', marginTop: '2px', gap: '8px' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        View Detailed Audit & PDF Report →
      </button>

    </div>
  );
}
