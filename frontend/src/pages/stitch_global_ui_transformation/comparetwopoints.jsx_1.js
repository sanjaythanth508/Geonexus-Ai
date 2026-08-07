import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/Map/MapComponent';
import { predictSite, getIndustryTypes, INDUSTRY_OPTIONS } from '../api/analysis';
import { isInsideGujarat } from '../utils/locationValidation';
import html2pdf from 'html2pdf.js';
import Layout from '../components/Common/Layout';

/* ── Utility helpers ── */
function formatIndustry(val) {
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ── StepBar ── */
function StepBar({ steps, current }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: i < steps.length - 1 ? '1' : 'unset' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            color: i < current ? 'var(--c-success)' : i === current ? 'var(--cyan)' : 'var(--text-muted)',
            fontWeight: i === current ? '800' : '600',
            fontSize: '13px', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
          }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: i < current ? 'var(--c-success)' : i === current ? 'rgba(56,189,248,0.2)' : 'var(--text-muted)',
              border: `2px solid ${i < current ? 'var(--c-success)' : i === current ? 'var(--c-primary-500)' : 'var(--text-muted)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: '900',
              color: i < current ? 'var(--text-primary)' : i === current ? 'var(--c-primary-500)' : 'var(--text-muted)',
              flexShrink: 0,
            }}>
              {i < current ? '✓' : i + 1}
            </div>
            {step}
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: '1px', background: i < current ? 'var(--c-success)' : 'var(--text-muted)', minWidth: '16px' }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── ScoreBadge ── */
function ScoreBadge({ score }) {
  const label = score >= 75 ? 'Excellent' : score >= 55 ? 'Good' : score >= 35 ? 'Moderate' : 'Poor';
  const color = score >= 75 ? 'var(--c-success)' : score >= 55 ? '#22D3EE' : score >= 35 ? '#F59E0B' : 'var(--c-error)';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '6px 14px', borderRadius: '20px',
      background: `${color}18`, border: `1px solid ${color}40`, color,
    }}>
      <span style={{ fontSize: '20px', fontWeight: '900' }}>{Number(score).toFixed(1)}</span>
      <span style={{ fontSize: '11px', fontWeight: '750' }}>/100 — {label}</span>
    </div>
  );
}

/* ── Spinner ── */
function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '48px', color: 'var(--text-muted)' }}>
      <svg width="48" height="48" viewBox="0 0 48 48" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(56,189,248,0.1)" strokeWidth="3" />
        <circle cx="24" cy="24" r="20" fill="none" stroke="var(--c-primary-500)" strokeWidth="3" strokeDasharray="40 86" strokeLinecap="round" />
      </svg>
      <p style={{ fontSize: '14.5px', fontWeight: '650' }}>Running suitability prediction models...</p>
    </div>
  );
}

export default function CompareTwoPoints() {
  const navigate = useNavigate();
  const pdfRef = useRef(null);
  const STEPS = ['Industry', 'Location A', 'Location B', 'Results'];

  const [step, setStep] = useState(0);
  const [industries, setIndustries] = useState([]);
  const [industry, setIndustry] = useState('');
  const [locA, setLocA] = useState(null);
  const [locB, setLocB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultA, setResultA] = useState(null);
  const [resultB, setResultB] = useState(null);

  useEffect(() => {
    getIndustryTypes()
      .then(types => {
        const opts = types.length ? types : INDUSTRY_OPTIONS.map(o => o.value);
        setIndustries(opts);
        setIndustry(opts[0] || '');
      })
      .catch(() => {
        const opts = INDUSTRY_OPTIONS.map(o => o.value);
        setIndustries(opts);
        setIndustry(opts[0] || '');
      });
  }, []);

  const handleLocASelect = ({ lat, lon }) => {
    if (!isInsideGujarat(lat, lon)) { setError('Location A coordinates are outside Gujarat borders.'); return; }
    setError('');
    setLocA({ lat, lon });
  };

  const handleLocBSelect = ({ lat, lon }) => {
    if (!isInsideGujarat(lat, lon)) { setError('Location B coordinates are outside Gujarat borders.'); return; }
    setError('');
    setLocB({ lat, lon });
  };

  const runComparison = async () => {
    setError('');
    setLoading(true);
    try {
      const [rA, rB] = await Promise.all([
        predictSite({ latitude: locA.lat, longitude: locA.lon, industryType: industry }),
        predictSite({ latitude: locB.lat, longitude: locB.lon, industryType: industry }),
      ]);
      setResultA(rA);
      setResultB(rB);
      setStep(3);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Prediction engine failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!pdfRef.current) return;
    html2pdf().set({
      margin: 10, filename: 'compare-two-points.pdf',
      html2canvas: { scale: 2 }, jsPDF: { orientation: 'portrait', format: 'a4' },
    }).from(pdfRef.current).save();
  };

  const criteriaKeys = resultA && resultB ? Object.keys(resultA.criteria_breakdown || {}) : [];
  const scoreA = resultA?.mcda_final_suitability_score ?? 0;
  const scoreB = resultB?.mcda_final_suitability_score ?? 0;
  const winner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'Tie';

  const allMarkers = [
    ...(locA ? [{ lat: locA.lat, lon: locA.lon, color: 'var(--c-primary-500)', label: 'Site A' }] : []),
    ...(locB ? [{ lat: locB.lat, lon: locB.lon, color: 'var(--c-warning)', label: 'Site B' }] : []),
  ];

  return (
    <Layout>
      {/* Subheader */}
      <div style={{
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '12px clamp(16px, 4vw, 40px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          <button
            onClick={() => navigate('/compare')}
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12.5px' }}
          >
            ← Compare Hub
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: '850', fontSize: '17px', letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--c-primary-500)' }}>Two-Point</span>
            <span style={{ color: 'var(--text-primary)' }}> Compare</span>
          </span>
        </div>
      </div>

      <main style={{ maxWidth: '1000px', width: '100%', margin: '0 auto', padding: 'clamp(24px,4vw,48px) clamp(16px,4vw,24px)' }} className="anim-fadeIn">
        <StepBar steps={STEPS} current={step} />

        {error && (
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'var(--c-surface)', border: '1px solid rgba(244,63,94,0.22)', color: 'var(--c-error)', fontSize: '13.5px', fontWeight: '700', marginBottom: '24px', textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        )}

        {/* STEP 0: Industry */}
        {step === 0 && (
          <div className="glass-bright" style={{ borderRadius: '20px', padding: '36px clamp(16px, 4vw, 36px)', border: '1px solid var(--border-default)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '900', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Select Target Industry</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 28px' }}>Choose the industry sector to evaluate both locations against.</p>
            
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
              {industries.map(ind => (
                <button
                  key={ind}
                  onClick={() => setIndustry(ind)}
                  style={{
                    padding: '14px 18px', borderRadius: '12px', cursor: 'pointer',
                    background: industry === ind ? 'rgba(56,189,248,0.12)' : 'var(--text-muted)',
                    border: `2px solid ${industry === ind ? 'var(--c-primary-500)' : 'var(--text-muted)'}`,
                    color: industry === ind ? 'var(--c-primary-500)' : 'var(--text-secondary)',
                    fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-sans)',
                    transition: 'all 0.2s', textAlign: 'left',
                  }}
                >
                  {formatIndustry(ind)}
                </button>
              ))}
            </div>
            <button
              disabled={!industry}
              onClick={() => setStep(1)}
              className="btn-primary"
              style={{ marginTop: '32px', padding: '14px 36px', fontSize: '14.5px' }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* STEP 1: Location A */}
        {step === 1 && (
          <div className="glass-bright" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
            <div style={{ padding: '24px clamp(16px, 4vw, 32px) 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--c-primary-500)', boxShadow: 'var(--shadow-md)' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>Select Location A</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', margin: 0 }}>Click anywhere on the map inside Gujarat state borders to set the first location (shown in blue).</p>
              {locA && <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--c-primary-500)', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>✓ Location A coordinates: {locA.lat.toFixed(5)}°N, {locA.lon.toFixed(5)}°E</div>}
            </div>
            <div style={{ height: '420px', position: 'relative' }}>
              <MapComponent
                onLocationSelect={handleLocASelect}
                markers={locA ? [{ lat: locA.lat, lon: locA.lon, color: 'var(--c-primary-500)', label: 'Site A' }] : []}
              />
            </div>
            <div style={{ padding: '20px clamp(16px, 4vw, 32px)', display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(0)} className="btn-ghost" style={{ padding: '12px 24px' }}>
                ← Back
              </button>
              <button
                disabled={!locA}
                onClick={() => setStep(2)}
                className="btn-primary"
                style={{ padding: '12px 28px' }}
              >
                {locA ? 'Continue to Location B →' : 'Set Location A'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Location B */}
        {step === 2 && (
          <div className="glass-bright" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
            <div style={{ padding: '24px clamp(16px, 4vw, 32px) 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--c-warning)', boxShadow: 'var(--shadow-md)' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>Select Location B</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', margin: 0 }}>Click anywhere inside Gujarat state borders to set the second location (shown in orange).</p>
              {locB && <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--c-warning)', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>✓ Location B coordinates: {locB.lat.toFixed(5)}°N, {locB.lon.toFixed(5)}°E</div>}
            </div>
            <div style={{ height: '420px', position: 'relative' }}>
              <MapComponent
                onLocationSelect={handleLocBSelect}
                markers={allMarkers}
              />
            </div>
            <div style={{ padding: '20px clamp(16px, 4vw, 32px)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setStep(1)} className="btn-ghost" style={{ padding: '12px 24px' }}>
                ← Back
              </button>
              <button
                disabled={!locB || loading}
                onClick={runComparison}
                className="btn-primary"
                style={{ padding: '12px 28px' }}
              >
                {locB ? '🚀 Run Suitability Comparison' : 'Set Location B'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Loading */}
        {loading && (
          <div className="glass-bright" style={{ borderRadius: '20px', border: '1px solid var(--border-default)' }}>
            <Spinner />
          </div>
        )}

        {/* STEP 3: Results */}
        {step === 3 && resultA && resultB && !loading && (
          <div ref={pdfRef} className="anim-fadeIn">
            {/* Winner banner */}
            <div style={{
              textAlign: 'center', padding: '24px', borderRadius: '16px', marginBottom: '28px',
              background: winner === 'Tie' ? 'rgba(99,102,241,0.06)' : winner === 'A' ? 'rgba(56,189,248,0.06)' : 'rgba(251,146,60,0.06)',
              border: `1.5px solid ${winner === 'Tie' ? 'rgba(99,102,241,0.22)' : winner === 'A' ? 'rgba(56,189,248,0.22)' : 'rgba(251,146,60,0.22)'}`,
            }}>
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>{winner === 'Tie' ? '🤝' : '🏆'}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '950', color: winner === 'Tie' ? '#6366F1' : winner === 'A' ? 'var(--c-primary-500)' : 'var(--c-warning)', letterSpacing: '-0.01em' }}>
                {winner === 'Tie' ? "It's a Tie!" : `Location ${winner} Wins!`}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '600' }}>
                {winner !== 'Tie' ? `Δ Score Delta: ${Math.abs(scoreA - scoreB).toFixed(1)} points` : 'Both locations score equally'}
              </div>
            </div>

            {/* Header pill */}
            <div style={{ marginBottom: '24px', padding: '14px 18px', borderRadius: '12px', background: 'var(--text-muted)', border: '1px solid var(--border-subtle)', fontSize: '13px', color: 'var(--text-muted)' }}>
              Industry Segment: <strong style={{ color: 'var(--text-primary)' }}>{formatIndustry(industry)}</strong>
              &nbsp;·&nbsp; Location A: <strong style={{ color: 'var(--c-primary-500)' }}>{resultA.district || `${locA.lat.toFixed(4)}°N`}</strong>
              &nbsp;·&nbsp; Location B: <strong style={{ color: 'var(--c-warning)' }}>{resultB.district || `${locB.lat.toFixed(4)}°N`}</strong>
            </div>

            {/* Score cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              {[
                { label: 'Location A', result: resultA, color: 'var(--c-primary-500)', loc: locA, score: scoreA, isWinner: winner === 'A' },
                { label: 'Location B', result: resultB, color: 'var(--c-warning)', loc: locB, score: scoreB, isWinner: winner === 'B' },
              ].map(({ label, result, color, loc, score, isWinner }) => (
                <div key={label} style={{
                  background: 'var(--c-surface)', backdropFilter: 'blur(20px)',
                  border: `1.5px solid ${isWinner ? color + '40' : 'var(--text-muted)'}`,
                  borderRadius: '20px', padding: '24px',
                  boxShadow: isWinner ? `0 12px 32px ${color}10` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: '850', fontSize: '17px' }}>{label}</span>
                    </div>
                    {isWinner && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: `${color}20`, color, border: `1px solid ${color}40`, fontWeight: '750' }}>WINNER</span>}
                  </div>
                  <div style={{ marginBottom: '14px' }}><ScoreBadge score={score} /></div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {result.district && <div><b>District:</b> {result.district}</div>}
                    <div><b>Coords:</b> {loc.lat.toFixed(5)}°N, {loc.lon.toFixed(5)}°E</div>
                    {result.lightgbm_predicted_label && <div><b>ML Label:</b> <span style={{ color: 'var(--text-secondary)' }}>{result.lightgbm_predicted_label}</span></div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Criteria comparative breakdown table */}
            {criteriaKeys.length > 0 && (
              <div style={{ background: 'var(--c-surface)', border: '1px solid var(--text-muted)', borderRadius: '20px', overflow: 'hidden', marginBottom: '32px' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--text-muted)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16.5px', fontWeight: '850', margin: 0 }}>Suitability Parameter Matrix</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }} className="responsive-table">
                    <thead>
                      <tr style={{ background: 'var(--text-muted)' }}>
                        <th style={{ padding: '12px 18px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '750' }}>Criterion Description</th>
                        <th style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--c-primary-500)', fontWeight: '750' }}>Score A</th>
                        <th style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--c-warning)', fontWeight: '750' }}>Score B</th>
                        <th style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '750' }}>Δ Delta</th>
                        <th style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '750' }}>Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {criteriaKeys.map((key, idx) => {
                        const cA = resultA.criteria_breakdown[key];
                        const cB = resultB.criteria_breakdown[key];
                        const sA = cA?.score_100 ?? 0;
                        const sB = cB?.score_100 ?? 0;
                        const delta = sA - sB;
                        const deltaColor = delta > 0 ? 'var(--c-success)' : delta < 0 ? 'var(--c-error)' : 'var(--text-muted)';
                        return (
                          <tr key={key} style={{ borderBottom: '1px solid var(--text-muted)', background: idx % 2 === 0 ? 'transparent' : 'var(--text-muted)' }}>
                            <td style={{ padding: '11px 18px', color: 'var(--text-primary)', fontWeight: '600', textTransform: 'capitalize' }}>
                              {key.replace(/_/g, ' ')}
                            </td>
                            <td style={{ padding: '11px 18px', textAlign: 'center', color: 'var(--c-primary-500)', fontWeight: '750' }}>{Number(sA).toFixed(1)}</td>
                            <td style={{ padding: '11px 18px', textAlign: 'center', color: 'var(--c-warning)', fontWeight: '750' }}>{Number(sB).toFixed(1)}</td>
                            <td style={{ padding: '11px 18px', textAlign: 'center', color: deltaColor, fontWeight: '800' }}>
                              {delta > 0 ? '+' : ''}{Number(delta).toFixed(1)}
                            </td>
                            <td style={{ padding: '11px 18px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>
                              {((cA?.weight ?? cB?.weight ?? 0) * 100).toFixed(0)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Score visual bars */}
            <div className="glass-bright" style={{ borderRadius: '20px', padding: '24px clamp(16px, 4vw, 24px)', border: '1px solid var(--border-default)', marginBottom: '32px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '850', margin: '0 0 20px' }}>Score Parameter Visualizations</h3>
              {criteriaKeys.slice(0, 8).map(key => {
                const sA = resultA.criteria_breakdown[key]?.score_100 ?? 0;
                const sB = resultB.criteria_breakdown[key]?.score_100 ?? 0;
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                return (
                  <div key={key} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      <span>{label}</span>
                      <span>A: <b style={{ color: 'var(--c-primary-500)' }}>{Number(sA).toFixed(1)}</b> · B: <b style={{ color: 'var(--c-warning)' }}>{Number(sB).toFixed(1)}</b></span>
                    </div>
                    <div style={{ position: 'relative', height: '6px', background: 'var(--text-muted)', borderRadius: '3px', marginBottom: '4px' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(sA, 100)}%`, background: 'linear-gradient(90deg, var(--c-primary-500), #6366F1)', borderRadius: '3px', transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ position: 'relative', height: '6px', background: 'var(--text-muted)', borderRadius: '3px' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(sB, 100)}%`, background: 'linear-gradient(90deg, var(--c-warning), #F59E0B)', borderRadius: '3px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  <div style={{ width: '24px', height: '6px', background: 'linear-gradient(90deg, var(--c-primary-500), #6366F1)', borderRadius: '3px' }} />
                  Location A
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  <div style={{ width: '24px', height: '6px', background: 'linear-gradient(90deg, var(--c-warning), #F59E0B)', borderRadius: '3px' }} />
                  Location B
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/compare')} className="btn-ghost" style={{ padding: '12px 24px' }}>
                ← Return to Hub
              </button>
              <button onClick={() => { setStep(0); setLocA(null); setLocB(null); setResultA(null); setResultB(null); setError(''); }} className="btn-ghost" style={{ padding: '12px 24px', color: 'var(--cyan)', borderColor: 'rgba(56,189,248,0.25)' }}>
                New Comparison
              </button>
              <button onClick={handleExportPDF} className="btn-primary" style={{ padding: '12px 28px', boxShadow: 'var(--shadow-md)' }}>
                📄 Download PDF Audit
              </button>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
