import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/Map/MapComponent';
import { predictSite, getIndustryTypes, INDUSTRY_OPTIONS } from '../api/analysis';
import { isInsideGujarat } from '../utils/locationValidation';
import html2pdf from 'html2pdf.js';

function fmt(val) {
  return (val || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ── Step Progress Bar ── */
function StepBar({ steps, current }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: i < steps.length - 1 ? '1' : 'unset' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            color: i < current ? '#10B981' : i === current ? '#A855F7' : 'var(--text-muted)',
            fontWeight: i === current ? '800' : '600',
            fontSize: '13px', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
          }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%',
              background: i < current ? '#10B981' : i === current ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
              border: `2px solid ${i < current ? '#10B981' : i === current ? '#A855F7' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: '900', flexShrink: 0,
              color: i < current ? '#fff' : i === current ? '#A855F7' : 'var(--text-muted)',
            }}>
              {i < current ? '✓' : i + 1}
            </div>
            {step}
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: '1px', background: i < current ? '#10B981' : 'rgba(255,255,255,0.08)', minWidth: '16px' }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Score Badge ── */
function ScoreBadge({ score, color }) {
  const label = score >= 75 ? 'Excellent' : score >= 55 ? 'Good' : score >= 35 ? 'Moderate' : 'Poor';
  const c = color || (score >= 75 ? '#10B981' : score >= 55 ? '#22D3EE' : score >= 35 ? '#F59E0B' : '#EF4444');
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      padding: '8px 16px', borderRadius: '24px',
      background: `${c}18`, border: `1px solid ${c}40`, color: c,
    }}>
      <span style={{ fontSize: '26px', fontWeight: '900', lineHeight: 1 }}>{Number(score).toFixed(1)}</span>
      <div>
        <div style={{ fontSize: '10px', fontWeight: '700', opacity: 0.7 }}>/100</div>
        <div style={{ fontSize: '11px', fontWeight: '800' }}>{label}</div>
      </div>
    </div>
  );
}

/* ── Industry Card (single-select) ── */
function IndustryCard({ ind, selected, disabled, onClick, color }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '12px 14px', borderRadius: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
        background: selected ? `${color}18` : disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${selected ? color : disabled ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'}`,
        color: selected ? color : disabled ? 'rgba(255,255,255,0.2)' : 'var(--text-secondary)',
        fontSize: '12px', fontWeight: '700', fontFamily: 'var(--font-sans)',
        transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: '8px',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <div style={{
        width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
        background: selected ? color : 'rgba(255,255,255,0.06)',
        border: `1.5px solid ${selected ? color : 'rgba(255,255,255,0.1)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '10px', color: '#fff',
      }}>
        {selected ? '✓' : ''}
      </div>
      <span style={{ lineHeight: 1.3 }}>{fmt(ind)}</span>
    </button>
  );
}

export default function CompareTwoIndustries() {
  const navigate = useNavigate();
  const pdfRef = useRef(null);

  // 3 steps: 0=Location, 1=Select Industries, 2=Results
  const STEPS = ['Select Location', 'Select Industries', 'View Results'];

  const [step, setStep] = useState(0);
  const [allIndustries, setAllIndustries] = useState([]);
  const [industryA, setIndustryA] = useState('');
  const [industryB, setIndustryB] = useState('');
  const [loc, setLoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultA, setResultA] = useState(null);
  const [resultB, setResultB] = useState(null);

  useEffect(() => {
    getIndustryTypes()
      .then(types => {
        const opts = types.length ? types : INDUSTRY_OPTIONS.map(o => o.value);
        setAllIndustries(opts);
        setIndustryA(opts[0] || '');
        setIndustryB(opts[1] || opts[0] || '');
      })
      .catch(() => {
        const opts = INDUSTRY_OPTIONS.map(o => o.value);
        setAllIndustries(opts);
        setIndustryA(opts[0] || '');
        setIndustryB(opts[1] || opts[0] || '');
      });
  }, []);

  const handleLocSelect = ({ lat, lon }) => {
    if (!isInsideGujarat(lat, lon)) {
      setError('Location is outside Gujarat. Please pick a point inside Gujarat.');
      return;
    }
    setError('');
    setLoc({ lat, lon });
  };

  const canRunComparison = industryA && industryB && industryA !== industryB;

  const runComparison = async () => {
    if (!canRunComparison) { setError('Please select two different industry types.'); return; }
    setError('');
    setLoading(true);
    try {
      const [rA, rB] = await Promise.all([
        predictSite({ latitude: loc.lat, longitude: loc.lon, industryType: industryA }),
        predictSite({ latitude: loc.lat, longitude: loc.lon, industryType: industryB }),
      ]);
      setResultA(rA);
      setResultB(rB);
      setStep(2);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Prediction failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!pdfRef.current) return;
    html2pdf().set({
      margin: 10, filename: 'compare-industries.pdf',
      html2canvas: { scale: 2 }, jsPDF: { orientation: 'portrait', format: 'a4' },
    }).from(pdfRef.current).save();
  };

  const scoreA = resultA?.mcda_final_suitability_score ?? 0;
  const scoreB = resultB?.mcda_final_suitability_score ?? 0;
  const winner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'Tie';
  const criteriaKeys = resultA && resultB ? Object.keys(resultA.criteria_breakdown || {}) : [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      {/* BG glows */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 50% at 20% 15%, rgba(168,85,247,0.09) 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 80% 85%, rgba(236,72,153,0.07) 0%, transparent 55%)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.1, backgroundImage: 'radial-gradient(rgba(168,85,247,0.5) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Navbar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, height: '64px', display: 'flex', alignItems: 'center', padding: '0 clamp(16px, 4vw, 40px)', background: 'rgba(3,7,18,0.88)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.07)', gap: '16px' }}>
        <button
          onClick={() => navigate('/compare')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '7px 14px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-sans)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.5)'; e.currentTarget.style.color = '#A855F7'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Compare Hub
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '17px', letterSpacing: '-0.03em' }}>
          <span style={{ background: 'linear-gradient(135deg, #A855F7, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Industry</span>
          <span style={{ color: 'var(--text-primary)' }}> Compare</span>
        </span>
        {/* Quick summary chip */}
        {step >= 1 && loc && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ padding: '5px 12px', borderRadius: '20px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', color: '#A855F7', fontSize: '11px', fontWeight: '700' }}>
              📍 {loc.lat.toFixed(3)}°N, {loc.lon.toFixed(3)}°E
            </div>
          </div>
        )}
      </header>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto', padding: 'clamp(32px, 5vw, 56px) clamp(16px, 4vw, 40px)' }}>
        <StepBar steps={STEPS} current={step} />

        {error && (
          <div style={{ padding: '12px 18px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: '13px', fontWeight: '600', marginBottom: '24px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ════════════════════════════════════
            STEP 0 — Select Location on Map
            ════════════════════════════════════ */}
        {step === 0 && (
          <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '800', margin: '0 0 6px', letterSpacing: '-0.03em' }}>Select a Location</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Click anywhere inside Gujarat to set the site for industry comparison.</p>
              {loc && (
                <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 14px', borderRadius: '20px', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#A855F7', fontSize: '13px', fontWeight: '700' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  ✓ {loc.lat.toFixed(5)}°N, {loc.lon.toFixed(5)}°E — Location Set
                </div>
              )}
            </div>
            <div style={{ height: '460px', position: 'relative' }}>
              <MapComponent
                onLocationSelect={handleLocSelect}
                markers={loc ? [{ lat: loc.lat, lon: loc.lon, color: '#A855F7', label: 'Site' }] : []}
              />
            </div>
            <div style={{ padding: '20px 32px', display: 'flex', gap: '12px', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button
                disabled={!loc}
                onClick={() => { setError(''); setStep(1); }}
                style={{
                  padding: '12px 28px', borderRadius: '10px',
                  background: loc ? 'linear-gradient(135deg, #A855F7, #EC4899)' : 'rgba(255,255,255,0.05)',
                  border: 'none', color: loc ? '#fff' : 'var(--text-muted)',
                  fontSize: '14px', fontWeight: '800', cursor: loc ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
                  boxShadow: loc ? '0 4px 20px rgba(168,85,247,0.3)' : 'none',
                }}
              >
                {loc ? 'Continue — Select Industries →' : 'Click the map to place a pin'}
              </button>
              {loc && (
                <button onClick={() => setLoc(null)} style={{ padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                  Reset Pin
                </button>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════
            STEP 1 — Select Both Industries (single page)
            ════════════════════════════════════ */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Location recap chip */}
            <div style={{ padding: '14px 20px', borderRadius: '14px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#A855F7"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Selected Location</span>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#A855F7', marginTop: '1px' }}>
                  {loc.lat.toFixed(5)}°N, {loc.lon.toFixed(5)}°E
                </div>
              </div>
              <button
                onClick={() => setStep(0)}
                style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >
                Change
              </button>
            </div>

            {/* Main card — both industries on ONE page, side by side */}
            <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.03em' }}>Select Two Industries</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                  Choose <b>Industry A</b> and <b>Industry B</b> to compare at this site. They must be different.
                </p>
              </div>

              <div style={{ padding: '24px 28px' }}>
                {/* Side-by-side panels */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                  {/* Industry A panel */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#A855F7', boxShadow: '0 0 6px #A855F7' }} />
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#A855F7' }}>Industry A</span>
                      {industryA && <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(168,85,247,0.8)', fontWeight: '700' }}>✓ {fmt(industryA)}</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
                      {allIndustries.map(ind => (
                        <IndustryCard
                          key={ind}
                          ind={ind}
                          selected={industryA === ind}
                          disabled={industryB === ind}
                          onClick={() => setIndustryA(ind)}
                          color="#A855F7"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Industry B panel */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EC4899', boxShadow: '0 0 6px #EC4899' }} />
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#EC4899' }}>Industry B</span>
                      {industryB && <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(236,72,153,0.8)', fontWeight: '700' }}>✓ {fmt(industryB)}</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
                      {allIndustries.map(ind => (
                        <IndustryCard
                          key={ind}
                          ind={ind}
                          selected={industryB === ind}
                          disabled={industryA === ind}
                          onClick={() => setIndustryB(ind)}
                          color="#EC4899"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Selection summary */}
                {industryA && industryB && industryA !== industryB && (
                  <div style={{ marginTop: '20px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px' }}>✅</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Comparing <strong style={{ color: '#A855F7' }}>{fmt(industryA)}</strong> vs <strong style={{ color: '#EC4899' }}>{fmt(industryB)}</strong>
                    </span>
                  </div>
                )}
                {industryA && industryB && industryA === industryB && (
                  <div style={{ marginTop: '20px', padding: '12px 18px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '13px', color: '#FCA5A5' }}>
                    ⚠️ Industry A and B must be different. Please change one selection.
                  </div>
                )}
              </div>

              {/* Footer buttons */}
              <div style={{ padding: '18px 28px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={() => setStep(0)} style={{ padding: '12px 22px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                  ← Back to Map
                </button>
                <button
                  disabled={!canRunComparison || loading}
                  onClick={runComparison}
                  style={{
                    padding: '12px 28px', borderRadius: '10px',
                    background: canRunComparison && !loading ? 'linear-gradient(135deg, #A855F7, #EC4899)' : 'rgba(255,255,255,0.05)',
                    border: 'none',
                    color: canRunComparison && !loading ? '#fff' : 'var(--text-muted)',
                    fontSize: '14px', fontWeight: '800',
                    cursor: canRunComparison && !loading ? 'pointer' : 'not-allowed',
                    fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
                    boxShadow: canRunComparison && !loading ? '0 4px 20px rgba(168,85,247,0.3)' : 'none',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  {loading ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
                        <circle cx="12" cy="12" r="9" fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="18 40" strokeLinecap="round"/>
                      </svg>
                      Running…
                    </>
                  ) : '🚀 Run Comparison →'}
                </button>
              </div>
            </div>

            {/* Loading overlay */}
            {loading && (
              <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <svg width="52" height="52" viewBox="0 0 52 52" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(168,85,247,0.15)" strokeWidth="3" />
                  <circle cx="26" cy="26" r="22" fill="none" stroke="#A855F7" strokeWidth="3" strokeDasharray="44 94" strokeLinecap="round" />
                </svg>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600', margin: 0 }}>
                  Running 2 predictions for this location…
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#A855F7', fontSize: '12px', fontWeight: '700' }}>{fmt(industryA)}</span>
                  <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)', color: '#EC4899', fontSize: '12px', fontWeight: '700' }}>{fmt(industryB)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════
            STEP 2 — Results Page
            ════════════════════════════════════ */}
        {step === 2 && resultA && resultB && !loading && (
          <div>
            {/* Winner banner */}
            <div style={{
              textAlign: 'center', padding: '24px 20px', borderRadius: '18px', marginBottom: '24px',
              background: winner === 'Tie' ? 'rgba(99,102,241,0.12)' : winner === 'A' ? 'rgba(168,85,247,0.12)' : 'rgba(236,72,153,0.12)',
              border: `1px solid ${winner === 'Tie' ? 'rgba(99,102,241,0.3)' : winner === 'A' ? 'rgba(168,85,247,0.3)' : 'rgba(236,72,153,0.3)'}`,
              boxShadow: winner !== 'Tie' ? `0 0 40px ${winner === 'A' ? 'rgba(168,85,247,0.12)' : 'rgba(236,72,153,0.12)'}` : 'none',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>{winner === 'Tie' ? '🤝' : '🏆'}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '900', color: winner === 'Tie' ? '#6366F1' : winner === 'A' ? '#A855F7' : '#EC4899' }}>
                {winner === 'Tie' ? "It's a Tie!" : `${fmt(winner === 'A' ? industryA : industryB)} is the Better Fit`}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                {winner !== 'Tie'
                  ? `Score advantage: ${Math.abs(scoreA - scoreB).toFixed(1)} points`
                  : 'Both industries score equally at this location'}
              </div>
            </div>

            {/* Context ribbon */}
            <div style={{ marginBottom: '20px', padding: '12px 18px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <span>📍 Location: <strong style={{ color: 'var(--text-primary)' }}>{resultA.district || `${loc.lat.toFixed(4)}°N, ${loc.lon.toFixed(4)}°E`}</strong></span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>A: <strong style={{ color: '#A855F7' }}>{fmt(industryA)}</strong></span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>B: <strong style={{ color: '#EC4899' }}>{fmt(industryB)}</strong></span>
            </div>

            <div ref={pdfRef}>
              {/* Score cards side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                {[
                  { label: fmt(industryA), result: resultA, color: '#A855F7', score: scoreA, isWinner: winner === 'A' },
                  { label: fmt(industryB), result: resultB, color: '#EC4899', score: scoreB, isWinner: winner === 'B' },
                ].map(({ label, result, color, score, isWinner }) => (
                  <div key={label} style={{
                    background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)',
                    border: `1.5px solid ${isWinner ? color + '55' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '18px', padding: '26px',
                    boxShadow: isWinner ? `0 4px 40px ${color}18` : 'none',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    {isWinner && (
                      <div style={{ position: 'absolute', top: '12px', right: '14px', fontSize: '10px', padding: '3px 9px', borderRadius: '20px', background: `${color}20`, color, border: `1px solid ${color}40`, fontWeight: '800', letterSpacing: '0.05em' }}>
                        WINNER ★
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '16px' }}>{label}</span>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <ScoreBadge score={score} color={color} />
                    </div>
                    {result.lightgbm_predicted_label && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        ML Verdict: <strong style={{ color: 'var(--text-secondary)' }}>{result.lightgbm_predicted_label}</strong>
                      </div>
                    )}
                    {/* Mini score bar */}
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(score, 100)}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: '3px', transition: 'width 0.8s ease' }} />
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>{Number(score).toFixed(1)} / 100</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Criteria breakdown table */}
              {criteriaKeys.length > 0 && (
                <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', overflow: 'hidden', marginBottom: '24px' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '800', margin: 0 }}>Criteria Breakdown</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0' }}>Same location — raw values are identical; scores differ by industry-specific weights</p>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <th style={{ padding: '12px 18px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Criterion</th>
                          <th style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Raw Value</th>
                          <th style={{ padding: '12px 14px', textAlign: 'center', color: '#A855F7', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{fmt(industryA)} (A)</th>
                          <th style={{ padding: '12px 14px', textAlign: 'center', color: '#EC4899', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{fmt(industryB)} (B)</th>
                          <th style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Δ Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {criteriaKeys.map((key, idx) => {
                          const cA = resultA.criteria_breakdown[key];
                          const cB = resultB.criteria_breakdown[key];
                          const raw = cA?.raw ?? cB?.raw ?? '—';
                          const sA = cA?.score_100 ?? 0;
                          const sB = cB?.score_100 ?? 0;
                          const delta = sA - sB;
                          const dc = delta > 0 ? '#A855F7' : delta < 0 ? '#EC4899' : 'var(--text-muted)';
                          return (
                            <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 ? 'rgba(255,255,255,0.013)' : 'transparent' }}>
                              <td style={{ padding: '11px 18px', color: 'var(--text-secondary)', fontWeight: '600' }}>{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
                              <td style={{ padding: '11px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>{typeof raw === 'number' ? Number(raw).toFixed(2) : raw}</td>
                              <td style={{ padding: '11px 14px', textAlign: 'center', color: '#A855F7', fontWeight: '700' }}>{Number(sA).toFixed(1)}</td>
                              <td style={{ padding: '11px 14px', textAlign: 'center', color: '#EC4899', fontWeight: '700' }}>{Number(sB).toFixed(1)}</td>
                              <td style={{ padding: '11px 14px', textAlign: 'center', color: dc, fontWeight: '800' }}>{delta > 0 ? '+' : ''}{Number(delta).toFixed(1)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Score bars visualisation */}
              <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '800', margin: '0 0 20px' }}>Score Visualisation</h3>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {[{ color: '#A855F7', label: fmt(industryA) }, { color: '#EC4899', label: fmt(industryB) }].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      <div style={{ width: '20px', height: '7px', background: color, borderRadius: '4px' }} />
                      {label}
                    </div>
                  ))}
                </div>
                {criteriaKeys.map(key => {
                  const sA = resultA.criteria_breakdown[key]?.score_100 ?? 0;
                  const sB = resultB.criteria_breakdown[key]?.score_100 ?? 0;
                  const lbl = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <div key={key} style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                        <span>{lbl}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>A: {Number(sA).toFixed(1)} · B: {Number(sB).toFixed(1)}</span>
                      </div>
                      <div style={{ position: 'relative', height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '3px', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', inset: 0, width: `${Math.min(sA, 100)}%`, background: 'linear-gradient(90deg,#A855F7,#6366F1)', borderRadius: '4px', transition: 'width 0.7s ease' }} />
                      </div>
                      <div style={{ position: 'relative', height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', inset: 0, width: `${Math.min(sB, 100)}%`, background: 'linear-gradient(90deg,#EC4899,#F43F5E)', borderRadius: '4px', transition: 'width 0.7s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/compare')} style={{ padding: '12px 24px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                ← Compare Hub
              </button>
              <button onClick={() => setStep(1)} style={{ padding: '12px 24px', borderRadius: '10px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', color: '#A855F7', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                ↩ Change Industries
              </button>
              <button onClick={() => { setStep(0); setLoc(null); setResultA(null); setResultB(null); setError(''); }} style={{ padding: '12px 24px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                New Comparison
              </button>
              <button onClick={handleExportPDF} style={{ padding: '12px 24px', borderRadius: '10px', background: 'linear-gradient(135deg, #A855F7, #EC4899)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: '0 4px 16px rgba(168,85,247,0.3)' }}>
                📄 Export PDF
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
