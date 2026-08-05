import { useEffect, useState } from "react";
import { getIndustryTypes, predictSite } from "../../api/analysis";
import { isInsideGujarat } from "../../utils/locationValidation";

/* ── Icons ── */
const CpuIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>;
const MapPinIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const PlayIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;

function LoadSpinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        style={{ animation: 'spin 0.75s linear infinite', transformOrigin: 'center' }}/>
    </svg>
  );
}

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

    if (!isInsideGujarat(latitude, longitude)) {
      setError(`Selected coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) are outside Gujarat! Please select a location within Gujarat territory.`);
      return;
    }

    setLoading(true);
    try {
      const result = await predictSite({ latitude, longitude, industryType });
      onResult?.(result);
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Analysis failed. Check location & parameters."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(20px)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--r-lg)',
      padding: '20px',
      boxShadow: 'var(--shadow-card)',
    }} className="anim-fadeIn">

      {/* Box Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'rgba(34, 211, 238, 0.12)', border: '1px solid rgba(34, 211, 238, 0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)'
        }}>
          <CpuIcon />
        </div>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>
            Run Suitability Analysis
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MCDA & LightGBM Machine Intelligence</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Industry Type Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Target Industry Sector
          </label>
          <select
            value={industryType}
            onChange={(e) => setIndustryType(e.target.value)}
            className="input-field"
            style={{ cursor: 'pointer', background: 'rgba(10, 14, 26, 0.85)' }}
          >
            {industryTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Coordinates Status Pill */}
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--r-md)',
          background: latitude != null ? 'rgba(34,211,238,0.06)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${latitude != null ? 'rgba(34,211,238,0.2)' : 'var(--border-subtle)'}`,
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px'
        }}>
          <div style={{ color: latitude != null ? 'var(--cyan)' : 'var(--text-muted)', display: 'flex' }}>
            <MapPinIcon />
          </div>
          <span style={{ color: latitude != null ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: latitude != null ? '600' : 'normal' }}>
            {latitude != null && longitude != null
              ? `${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E`
              : "Tap any point inside Gujarat on map"}
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '10px 12px', borderRadius: 'var(--r-sm)',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#FCA5A5', fontSize: '12px', fontWeight: '600'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Run Action Button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary"
          style={{
            width: '100%', padding: '12px', fontSize: '14px',
            opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? (
            <><LoadSpinner /> Processing ML Model...</>
          ) : (
            <><PlayIcon /> Execute AI Analysis</>
          )}
        </button>
      </form>
    </div>
  );
}