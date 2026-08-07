import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/Map/MapComponent';
import { predictSite, getIndustryTypes, INDUSTRY_OPTIONS } from '../api/analysis';
import { isInsideGujarat } from '../utils/locationValidation';
import html2pdf from 'html2pdf.js';
import Layout from '../components/Common/Layout';

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
            color: i < current ? 'var(--c-success)' : i === current ? 'var(--c-primary-500)' : 'var(--text-muted)',
            fontWeight: i === current ? '800' : '600',
            fontSize: '13px', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
          }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%',
              background: i < current ? 'var(--c-success)' : i === current ? 'rgba(168,85,247,0.2)' : 'var(--text-muted)',
              border: `2px solid ${i < current ? 'var(--c-success)' : i === current ? 'var(--c-primary-500)' : 'var(--text-muted)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: '900', flexShrink: 0,
              color: i < current ? 'var(--text-primary)' : i === current ? 'var(--c-primary-500)' : 'var(--text-muted)',
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

/* ── Score Badge ── */
function ScoreBadge({ score, color }) {
  const label = score >= 75 ? 'Excellent' : score >= 55 ? 'Good' : score >= 35 ? 'Moderate' : 'Poor';
  const c = color || (score >= 75 ? 'var(--c-success)' : score >= 55 ? '#22D3EE' : score >= 35 ? '#F59E0B' : 'var(--c-error)');
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

/* ── Industry Card ── */
function IndustryCard({ ind, selected, disabled, onClick, color }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '12px 14px', borderRadius: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
        background: selected ? `${color}18` : disabled ? 'var(--text-muted)' : 'var(--text-muted)',
        border: `1.5px solid ${selected ? color : disabled ? 'var(--text-muted)' : 'var(--text-muted)'}`,
        color: selected ? color : disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
        fontSize: '12px', fontWeight: '700', fontFamily: 'var(--font-sans)',
        transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: '8px',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <div style={{
        width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
        background: selected ? color : 'var(--text-muted)',
        border: `1.5px solid ${selected ? color : 'var(--text-muted)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '10px', color: 'var(--text-primary)',
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
      setError('Location coordinates are outside Gujarat state borders.');
      return;
    }
    setError('');
    setLoc({ lat, lon });
  };

  const canRunComparison = industryA && industryB && industryA !== industryB;

  const runComparison = async () => {
    if (!canRunComparison) { setError('Please select two different industry sectors.'); return; }
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
      setError(e?.response?.data?.error || e?.message || 'Prediction analysis failed.');
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
            <span style={{ color: 'var(--c-primary-500)' }}>Industry</span>
            <span style={{ color: 'var(--text-primary)' }}> Compare</span>
          </span>
          {step >= 1 && loc && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px',
              background: 'var(--c-surface)', border: '1px solid rgba(168,85,247,0.22)',
              borderRadius: '20px', fontSize: '12px', color: 'var(--c-primary-500)', fontWeight: '750',
              fontVariantNumeric: 'tabular-nums'
            }}>
              📍 {loc.lat.toFixed(4)}°N, {loc.lon.toFixed(4)}°E
            </div>
          )}
        </div>
      </div>

      <main style={{ maxWidth: '1000px', width: '100%', margin: '0 auto', padding: 'clamp(24px,4vw,48px) clamp(16px,4vw,24px)' }} className="anim-fadeIn">
        <StepBar steps={STEPS} current={step} />

        {error && (
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'var(--c-surface)', border: '1px solid rgba(244,63,94,0.22)', color: 'var(--c-error)', fontSize: '13.5px', fontWeight: '700', marginBottom: '24px', textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        )}

        {/* STEP 0: Select Location */}
        {step === 0 && (
          <div className="glass-bright" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
            <div style={{ padding: '24px clamp(16px, 4vw, 32px) 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '900', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Select Location Site</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', margin: 0 }}>Click anywhere on the map inside Gujarat state borders to specify the target siting coordinate.</p>
              {loc && <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--c-primary-500)', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>✓ Siting coordinates: {loc.lat.toFixed(5)}°N, {loc.lon.toFixed(5)}°E</div>}
            </div>
            <div style={{ height: '420px', position: 'relative' }}>
              <MapComponent
                onLocationSelect={handleLocSelect}
                markers={loc ? [{ lat: loc.lat, lon: loc.lon, color: 'var(--c-primary-500)', label: 'Selected Site' }] : []}
              />
            </div>
            <div style={{ padding: '20px clamp(16px, 4vw, 32px)', display: 'flex', gap: '12px' }}>
              <button
                disabled={!loc}
                onClick={() => setStep(1)}
                className="btn-primary"
                style={{ padding: '12px 28px' }}
              >
                {loc ? 'Continue to Sectors →' : 'Set Siting Location'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Select Industries */}
        {step === 1 && (
          <div className="glass-bright" style={{ borderRadius: '20px', padding: '36px clamp(16px, 4vw, 36px)', border: '1px solid var(--border-default)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '900', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Select Industry Sectors</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 32px' }}>Pick two different industrial sectors to compare suitability parameters at this coordinate.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
              {/* Sector A */}
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--c-primary-500)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>Industry Sector A</h4>
                <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr 1fr' }}>
                  {allIndustries.map(ind => (
                    <IndustryCard
                      key={ind} ind={ind} color="var(--c-primary-500)"
                      selected={industryA === ind} disabled={industryB === ind}
                      onClick={() => setIndustryA(ind)}
                    />
                  ))}
                </div>
              </div>

              {/* Sector B */}
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--c-warning)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>Industry Sector B</h4>
                <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr 1fr' }}>
                  {allIndustries.map(ind => (
                    <IndustryCard
                      key={ind} ind={ind} color="var(--c-warning)"
                      selected={industryB === ind} disabled={industryA === ind}
                      onClick={() => setIndustryB(ind)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '36px', flexWrap: 'wrap' }}>
              <button onClick={() => setStep(0)} className="btn-ghost" style={{ padding: '12px 24px' }}>
                ← Back
              </button>
              <button
                disabled={!canRunComparison || loading}
                onClick={runComparison}
                className="btn-primary"
                style={{ padding: '12px 28px' }}
              >
                🚀 Run Industry Comparison
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="glass-bright" style={{ borderRadius: '20px', border: '1px solid var(--border-default)' }}>
            <Spinner />
          </div>
        )}

        {/* STEP 2: Results */}
        {step === 2 && resultA && resultB && !loading && (
          <div ref={pdfRef} className="anim-fadeIn">
            {/* Winner panel */}
            <div style={{
              textAlign: 'center', padding: '24px', borderRadius: '16px', marginBottom: '28px',
              background: winner === 'Tie' ? 'rgba(99,102,241,0.06)' : winner === 'A' ? 'rgba(56,189,248,0.06)' : 'rgba(251,146,60,0.06)',
              border: `1.5px solid ${winner === 'Tie' ? 'rgba(99,102,241,0.22)' : winner === 'A' ? 'rgba(56,189,248,0.22)' : 'rgba(251,146,60,0.22)'}`,
            }}>
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>{winner === 'Tie' ? '🤝' : '🏆'}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '950', color: winner === 'Tie' ? '#6366F1' : winner === 'A' ? 'var(--c-primary-500)' : 'var(--c-warning)', letterSpacing: '-0.01em' }}>
                {winner === 'Tie' ? "Both sectors score equally!" : `${fmt(winner === 'A' ? industryA : industryB)} Siting Selected!`}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '600' }}>
                {winner !== 'Tie' ? `Δ Score Delta: ${Math.abs(scoreA - scoreB).toFixed(1)} suitability points` : 'Both sectors have matching suitability index'}
              </div>
            </div>

            {/* Overview banner */}
            <div style={{ marginBottom: '24px', padding: '14px 18px', borderRadius: '12px', background: 'var(--text-muted)', border: '1px solid var(--border-subtle)', fontSize: '13px', color: 'var(--text-muted)' }}>
              Siting Region: <strong style={{ color: 'var(--text-primary)' }}>{resultA.district || 'Gujarat'}</strong>
              &nbsp;·&nbsp; Sector A: <strong style={{ color: 'var(--c-primary-500)' }}>{fmt(industryA)}</strong>
              &nbsp;·&nbsp; Sector B: <strong style={{ color: 'var(--c-warning)' }}>{fmt(industryB)}</strong>
            </div>

            {/* Score cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              {[
                { label: fmt(industryA), result: resultA, color: 'var(--c-primary-500)', score: scoreA, isWinner: winner === 'A' },
                { label: fmt(industryB), result: resultB, color: 'var(--c-warning)', score: scoreB, isWinner: winner === 'B' },
              ].map(({ label, result, color, score, isWinner }) => (
                <div key={label} style={{
                  background: 'var(--c-surface)', backdropFilter: 'blur(20px)',
                  border: `1.5px solid ${isWinner ? color + '40' : 'var(--text-muted)'}`,
                  borderRadius: '20px', padding: '24px',
                  boxShadow: isWinner ? `0 12px 32px ${color}10` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: '850', fontSize: '17px', color: 'var(--text-primary)' }}>{label}</span>
                    {isWinner && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: `${color}20`, color, border: `1px solid ${color}40`, fontWeight: '750' }}>WINNER</span>}
                  </div>
                  <div style={{ marginBottom: '14px' }}><ScoreBadge score={score} color={color} /></div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    <div><b>Infrastructure Highway Link:</b> {result.nearest_highway_ref || 'NH'}</div>
                    <div><b>Supply River Vector:</b> {result.nearest_river_name || 'River'}</div>
                    {result.lightgbm_predicted_label && <div><b>ML suitability label:</b> {result.lightgbm_predicted_label}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Criteria breakdown table */}
            {criteriaKeys.length > 0 && (
              <div style={{ background: 'var(--c-surface)', border: '1px solid var(--text-muted)', borderRadius: '20px', overflow: 'hidden', marginBottom: '32px' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--text-muted)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16.5px', fontWeight: '850', margin: 0 }}>Suitability Matrix Breakdown</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }} className="responsive-table">
                    <thead>
                      <tr style={{ background: 'var(--text-muted)' }}>
                        <th style={{ padding: '12px 18px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '750' }}>Criterion Parameter</th>
                        <th style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--c-primary-500)', fontWeight: '750' }}>Score A</th>
                        <th style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--c-warning)', fontWeight: '750' }}>Score B</th>
                        <th style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '750' }}>Δ Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {criteriaKeys.map((key, idx) => {
                        const cA = resultA.criteria_breakdown[key];
                        const cB = resultB.criteria_breakdown[key];
                        const sA = cA?.score_100 ?? 0;
                        const sB = cB?.score_100 ?? 0;
                        const delta = sA - sB;
                        const deltaColor = delta > 0 ? 'var(--c-primary-500)' : delta < 0 ? 'var(--c-warning)' : 'var(--text-muted)';
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/compare')} className="btn-ghost" style={{ padding: '12px 24px' }}>
                ← Return to Hub
              </button>
              <button onClick={() => { setStep(0); setLoc(null); setResultA(null); setResultB(null); setError(''); }} className="btn-ghost" style={{ padding: '12px 24px', color: 'var(--cyan)', borderColor: 'rgba(56,189,248,0.25)' }}>
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
