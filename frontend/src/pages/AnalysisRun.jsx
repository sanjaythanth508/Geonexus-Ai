import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getIndustryTypes, predictSite, findSuggestion } from '../api/analysis';
import { isInsideGujarat } from '../utils/locationValidation';
import api from '../api/client';

/* ── Icons ── */
const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const SpinIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" style={{ animation: 'spin 0.75s linear infinite', transformOrigin: 'center' }}/></svg>;
const PlayIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const PinIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;

const INDUSTRY_ICONS = {
  'Warehousing': '🏭', 'Textile': '🧵', 'Pharmaceutical': '💊', 'Chemical': '⚗️',
  'Food Processing': '🌽', 'Ceramic': '🏺', 'Diamond': '💎', 'Cotton': '🌾',
  'Steel': '⚙️', 'Plastics': '🔬', 'Paper': '📄', 'Renewable Energy': '⚡',
  'Engineering': '🔧', 'Electronics': '💻', 'IT': '🖥️', 'Auto': '🚗',
};

function getIndustryIcon(type) {
  const key = Object.keys(INDUSTRY_ICONS).find(k => type?.toLowerCase().includes(k.toLowerCase()));
  return key ? INDUSTRY_ICONS[key] : '🏗️';
}

function IndustryCard({ industry, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(industry)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        padding: '20px 16px', borderRadius: '16px', cursor: 'pointer',
        background: selected ? 'rgba(56,189,248,0.12)' : 'rgba(11,15,25,0.6)',
        border: `2px solid ${selected ? 'rgba(56,189,248,0.6)' : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        transform: selected ? 'scale(1.04)' : 'scale(1)',
        boxShadow: selected ? '0 8px 32px rgba(56,189,248,0.2)' : '0 2px 12px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(12px)',
        fontFamily: 'var(--font-sans)',
      }}
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = 'rgba(56,189,248,0.25)'; e.currentTarget.style.background = 'rgba(56,189,248,0.05)'; }}}
      onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(11,15,25,0.6)'; }}}
    >
      <span style={{ fontSize: '30px', lineHeight: 1 }}>{getIndustryIcon(industry)}</span>
      <span style={{
        fontSize: '12px', fontWeight: selected ? '800' : '600',
        color: selected ? 'var(--cyan)' : 'var(--text-secondary)',
        textAlign: 'center', lineHeight: 1.3, transition: 'color 0.2s',
      }}>
        {industry}
      </span>
      {selected && (
        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      )}
    </button>
  );
}

export default function AnalysisRun() {
  const navLocation = useLocation();
  const navigate = useNavigate();

  const location = navLocation.state?.location
    || (() => { try { return JSON.parse(sessionStorage.getItem('analysisLocation') || 'null'); } catch { return null; } })();

  const [industries, setIndustries] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingNode, setSavingNode] = useState(false);
  const [result, setResult] = useState(null);

  const [searchingSuggestion, setSearchingSuggestion] = useState(false);
  const [searchedSuggestion, setSearchedSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  useEffect(() => {
    getIndustryTypes().then(types => {
      setIndustries(types);
      if (types.length > 0) setSelectedIndustry(types[0]);
    }).catch(() => {});
  }, []);

  if (!location) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
        <div style={{ fontSize: '48px' }}>📍</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: '800' }}>No Location Selected</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Please select a location on the map first.</p>
        <button onClick={() => navigate('/analysis')} style={{ padding: '11px 24px', background: 'var(--grad-btn)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          Go to Map →
        </button>
      </div>
    );
  }

  const handleRunAnalysis = async () => {
    if (!selectedIndustry || loading) return;

    if (!isInsideGujarat(location.lat, location.lon)) {
      setError(`Coordinates (${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}) are outside Gujarat. Please select a valid Gujarat location.`);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await predictSite({ latitude: location.lat, longitude: location.lon, industryType: selectedIndustry });
      sessionStorage.setItem('last_prediction_report', JSON.stringify(res));
      navigate('/analysis/result');
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFindSuggestion = async () => {
    if (!result || searchingSuggestion) return;
    setSearchingSuggestion(true);
    try {
      const res = await findSuggestion({
        latitude: location.lat,
        longitude: location.lon,
        industryType: selectedIndustry,
        currentScore: scoreNum,
      });
      setSuggestion(res || null);
      if (res) {
        sessionStorage.setItem('better_site_suggestion', JSON.stringify(res));
      } else {
        sessionStorage.removeItem('better_site_suggestion');
      }
      setSearchedSuggestion(true);
    } catch (e) {
      console.error("Suggestion search error:", e);
    } finally {
      setSearchingSuggestion(false);
    }
  };

  const handleViewFullReport = () => {
    if (!result) return;
    sessionStorage.setItem('last_prediction_report', JSON.stringify(result));
    navigate('/report', { state: { result } });
  };

  const handleDeployNode = async () => {
    if (!result) return;
    setSavingNode(true);
    try {
      const district = result.district || 'Gujarat';
      const industry = result.industry_type || selectedIndustry;
      await api.post('projects/', {
        name: `${industry} – ${district}`,
        latitude: location.lat,
        longitude: location.lon,
        description: '',
        analysis_data: result,
      });
      navigate('/nodes');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save node.');
    } finally {
      setSavingNode(false);
    }
  };

  const scoreNum = result ? Number(result.mcda_final_suitability_score || 0) : 0;
  let badgeColor = '#22D3EE', badgeBg = 'rgba(34,211,238,0.12)', badgeBorder = 'rgba(34,211,238,0.3)', categoryLabel = 'Good';
  if (scoreNum >= 70) { badgeColor = '#10B981'; badgeBg = 'rgba(16,185,129,0.12)'; badgeBorder = 'rgba(16,185,129,0.3)'; categoryLabel = 'Excellent'; }
  else if (scoreNum < 45) { badgeColor = '#F43F5E'; badgeBg = 'rgba(244,63,94,0.12)'; badgeBorder = 'rgba(244,63,94,0.3)'; categoryLabel = 'Poor'; }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      {/* Bg glow */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(56,189,248,0.08) 0%, transparent 60%)' }} />

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100, height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px,4vw,40px)',
        background: 'rgba(3,7,18,0.90)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate('/analysis')}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600', transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(56,189,248,0.3)'; e.currentTarget.style.color = 'var(--cyan)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <BackIcon /> Back to Map
          </button>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
              Industry <span style={{ color: 'var(--cyan)' }}>Selection</span>
            </h1>
          </div>
        </div>

        {/* Location pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px',
          background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
          borderRadius: '20px', fontSize: '13px', fontWeight: '600', color: 'var(--cyan)',
        }}>
          <PinIcon />
          {Number(location.lat).toFixed(4)}° N, {Number(location.lon).toFixed(4)}° E
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '960px', margin: '0 auto', padding: 'clamp(28px,4vw,48px) clamp(16px,4vw,40px)' }}>
          <>
            {/* Step label */}
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px',
                borderRadius: '20px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
                marginBottom: '16px', fontSize: '12px', fontWeight: '700', color: 'var(--cyan)', letterSpacing: '0.05em',
              }}>
                Step 2 of 2
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,4vw,38px)', fontWeight: '900', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
                Select Industry Type
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: 0 }}>
                Choose the industry sector to analyze for suitability at the selected location.
              </p>
            </div>

            {/* Industry grid */}
            {industries.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '14px', marginBottom: '36px',
              }}>
                {industries.map(ind => (
                  <IndustryCard
                    key={ind}
                    industry={ind}
                    selected={selectedIndustry === ind}
                    onSelect={setSelectedIndustry}
                  />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <SpinIcon /> Loading industry types...
              </div>
            )}

            {error && (
              <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: '#FCA5A5', fontSize: '14px', fontWeight: '600', marginBottom: '24px' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={handleRunAnalysis}
                disabled={!selectedIndustry || loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 48px',
                  background: 'var(--grad-btn)', border: 'none', borderRadius: '16px',
                  color: '#fff', fontWeight: '900', fontSize: '16px', cursor: 'pointer',
                  opacity: (!selectedIndustry || loading) ? 0.6 : 1,
                  transition: 'all 0.25s', fontFamily: 'var(--font-sans)',
                  boxShadow: '0 8px 32px rgba(56,189,248,0.25)', letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => { if (!loading && selectedIndustry) { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(56,189,248,0.35)'; }}}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(56,189,248,0.25)'; }}
              >
                {loading ? <><SpinIcon /> Running AI Analysis...</> : <><PlayIcon /> Run Suitability Analysis</>}
              </button>
            </div>
          </>
      </main>
    </div>
  );
}
