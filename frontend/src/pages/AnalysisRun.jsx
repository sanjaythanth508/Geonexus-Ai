import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getIndustryTypes, predictSite } from '../api/analysis';
import { isInsideGujarat } from '../utils/locationValidation';
import Layout from '../components/Common/Layout';

/* ── Icons ── */
const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const SpinIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" style={{ animation: 'spin 0.75s linear infinite', transformOrigin: 'center' }}/></svg>;
const PlayIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const PinIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;

const INDUSTRY_ICONS = {
  'Warehousing': '', 'Textile': '', 'Pharmaceutical': '', 'Chemical': '️',
  'Food Processing': '', 'Ceramic': '', 'Diamond': '', 'Cotton': '',
  'Steel': '️', 'Plastics': '', 'Paper': '', 'Renewable Energy': '',
  'Engineering': '', 'Electronics': '', 'IT': '️', 'Auto': '',
};

function getIndustryIcon(type) {
  const key = Object.keys(INDUSTRY_ICONS).find(k => type?.toLowerCase().includes(k.toLowerCase()));
  return key ? INDUSTRY_ICONS[key] : '️';
}

function IndustryCard({ industry, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(industry)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        padding: '24px 16px', borderRadius: '16px', cursor: 'pointer',
        background: selected ? 'var(--c-primary-50)' : 'var(--c-surface)',
        border: `2px solid ${selected ? 'var(--c-primary-500)' : 'var(--border-default)'}`,
        transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: selected ? 'scale(1.04)' : 'scale(1)',
        boxShadow: selected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        fontFamily: 'var(--font-sans)',
      }}
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = 'var(--c-primary-300)'; e.currentTarget.style.background = 'var(--c-surface-hover)'; }}}
      onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--c-surface)'; }}}
    >
      <span style={{ fontSize: '32px', lineHeight: 1 }}>{getIndustryIcon(industry)}</span>
      <span style={{
        fontSize: '13px', fontWeight: selected ? '800' : '600',
        color: selected ? 'var(--c-primary-700)' : 'var(--text-secondary)',
        textAlign: 'center', lineHeight: 1.3, transition: 'color 0.2s',
      }}>
        {industry}
      </span>
      {selected && (
        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--c-primary-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--c-dark-950)" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
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

  useEffect(() => {
    getIndustryTypes().then(types => {
      setIndustries(types);
      if (types.length > 0) setSelectedIndustry(types[0]);
    }).catch(() => {});
  }, []);

  if (!location) {
    return (
      <Layout>
        <div style={{
          minHeight: '60vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '18px',
          color: 'var(--text-primary)', textAlign: 'center', padding: '24px'
        }}>
          <div style={{ fontSize: '48px' }}></div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: '850', fontSize: '22px' }}>No Location Coordinates Found</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14.5px', maxWidth: '380px' }}>
            Please mark a location coordinate point inside Gujarat on the dashboard map view first.
          </p>
          <button onClick={() => navigate('/analysis')} className="btn-primary" style={{ padding: '12px 24px' }}>
            Open Interactive Map
          </button>
        </div>
      </Layout>
    );
  }

  const handleRunAnalysis = async () => {
    if (!selectedIndustry || loading) return;

    if (!isInsideGujarat(location.lat, location.lon)) {
      setError(`Coordinates (${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}) are outside Gujarat borders.`);
      return;
    }

    setError('');
    setLoading(true);
    try {
      sessionStorage.removeItem('better_site_suggestion');
      const res = await predictSite({ latitude: location.lat, longitude: location.lon, industryType: selectedIndustry });
      sessionStorage.setItem('last_prediction_report', JSON.stringify(res));
      navigate('/analysis/result');
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Inference engine failed to score coordinates.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {/* Dynamic Sub-header Navigation row */}
      <div style={{
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '12px clamp(16px, 4vw, 40px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          <button
            onClick={() => navigate('/analysis')}
            className="btn-ghost"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12.5px'
            }}
          >
            <BackIcon /> Return to Map
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
            background: 'var(--c-primary-50)', border: '1px solid var(--c-primary-100)',
            borderRadius: '20px', fontSize: '12.5px', fontWeight: '700', color: 'var(--c-primary-700)',
            fontVariantNumeric: 'tabular-nums'
          }}>
            <PinIcon />
            {Number(location.lat).toFixed(5)}° N, {Number(location.lon).toFixed(5)}° E
          </div>
        </div>
      </div>

      <main style={{ maxWidth: '1000px', width: '100%', margin: '0 auto', padding: 'clamp(28px,4vw,48px) clamp(16px,4vw,40px)' }} className="anim-fadeIn">
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px',
            borderRadius: '20px', background: 'var(--c-primary-50)', border: '1px solid var(--c-primary-100)',
            marginBottom: '16px', fontSize: '11.5px', fontWeight: '850', color: 'var(--c-primary-700)', letterSpacing: '0.04em', textTransform: 'uppercase'
          }}>
            Specification Phase
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,4vw,36px)', fontWeight: '900', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Choose Target Industry Sector
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14.5px', margin: 0 }}>
            Specify the industrial classification to run multi-criteria geospatial analysis scoring.
          </p>
        </div>

        {/* Industry Cards Grid */}
        {industries.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '16px', marginBottom: '36px',
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
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', color: 'var(--text-muted)', gap: '10px' }}>
            <SpinIcon />
            <span>Loading sector indices...</span>
          </div>
        )}

        {error && (
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'var(--c-error-light)', border: '1px solid var(--c-error)', color: 'var(--c-error)', fontSize: '13.5px', fontWeight: '700', marginBottom: '24px', textAlign: 'center' }}>
            ️ {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleRunAnalysis}
            disabled={!selectedIndustry || loading}
            className="btn-primary"
            style={{
              padding: '14px 40px', fontSize: '15px',
              opacity: (!selectedIndustry || loading) ? 0.65 : 1,
              transition: 'all 0.25s',
              boxShadow: 'var(--shadow-md)',
              minWidth: '220px'
            }}
          >
            {loading ? <><SpinIcon /> Syncing with ML Engine...</> : <><PlayIcon /> Run Suitability Analysis</>}
          </button>
        </div>
      </main>
    </Layout>
  );
}
