import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/Map/MapComponent';
import { predictSite, getIndustryTypes, INDUSTRY_OPTIONS } from '../api/analysis';
import { isInsideGujarat } from '../utils/locationValidation';
import html2pdf from 'html2pdf.js';

/* ── Utility helpers ─────────────────────────────────────── */
function formatIndustry(val) {
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ── StepBar ─────────────────────────────────────────────── */
function StepBar({ steps, current }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: i < steps.length - 1 ? '1' : 'unset' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            color: i < current ? '#10B981' : i === current ? 'var(--cyan)' : 'var(--text-muted)',
            fontWeight: i === current ? '800' : '600',
            fontSize: '13px', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
          }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: i < current ? '#10B981' : i === current ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.05)',
              border: `2px solid ${i < current ? '#10B981' : i === current ? '#38BDF8' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: '900',
              color: i < current ? '#fff' : i === current ? '#38BDF8' : 'var(--text-muted)',
              flexShrink: 0,
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

/* ── ScoreBadge ──────────────────────────────────────────── */
function ScoreBadge({ score }) {
  const label = score >= 75 ? 'Excellent' : score >= 55 ? 'Good' : score >= 35 ? 'Moderate' : 'Poor';
  const color = score >= 75 ? '#10B981' : score >= 55 ? '#22D3EE' : score >= 35 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '6px 14px', borderRadius: '20px',
      background: `${color}18`, border: `1px solid ${color}40`, color,
    }}>
      <span style={{ fontSize: '20px', fontWeight: '900' }}>{Number(score).toFixed(1)}</span>
      <span style={{ fontSize: '11px', fontWeight: '700' }}>/100 — {label}</span>
    </div>
  );
}

/* ── Spinner ─────────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '48px' }}>
      <div style={{ width: '48px', height: '48px', position: 'relative' }}>
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(56,189,248,0.15)" strokeWidth="3" />
          <circle cx="24" cy="24" r="20" fill="none" stroke="#38BDF8" strokeWidth="3" strokeDasharray="40 86" strokeLinecap="round" />
        </svg>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>Running predictions…</p>
    </div>
  );
}

/* ── MAIN PAGE ───────────────────────────────────────────── */
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
    if (!isInsideGujarat(lat, lon)) { setError('Location A is outside Gujarat. Please pick a point inside Gujarat.'); return; }
    setError('');
    setLocA({ lat, lon });
  };

  const handleLocBSelect = ({ lat, lon }) => {
    if (!isInsideGujarat(lat, lon)) { setError('Location B is outside Gujarat. Please pick a point inside Gujarat.'); return; }
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
      setError(e?.response?.data?.error || e?.message || 'Prediction failed. Try again.');
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

  // Build criteria table data
  const criteriaKeys = resultA && resultB
    ? Object.keys(resultA.criteria_breakdown || {})
    : [];

  const scoreA = resultA?.mcda_final_suitability_score ?? 0;
  const scoreB = resultB?.mcda_final_suitability_score ?? 0;
  const winner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'Tie';

  const allMarkers = [
    ...(locA ? [{ lat: locA.lat, lon: locA.lon, color: '#38BDF8', label: 'Site A' }] : []),
    ...(locB ? [{ lat: locB.lat, lon: locB.lon, color: '#FB923C', label: 'Site B' }] : []),
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 50% at 10% 20%, rgba(56,189,248,0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 90% 80%, rgba(99,102,241,0.07) 0%, transparent 55%)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.15, backgroundImage: 'radial-gradient(rgba(56,189,248,0.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Navbar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, height: '64px', display: 'flex', alignItems: 'center', padding: '0 clamp(16px, 4vw, 40px)', background: 'rgba(3, 7, 18, 0.85)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.07)', gap: '16px' }}>
        <button
          onClick={() => navigate('/compare')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '7px 14px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-sans)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(56,189,248,0.4)'; e.currentTarget.style.color = 'var(--cyan)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Compare Hub
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '17px', letterSpacing: '-0.03em' }}>
          <span style={{ background: 'linear-gradient(135deg, #38BDF8, #6366F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Two-Point</span>
          <span style={{ color: 'var(--text-primary)' }}> Compare</span>
        </span>
      </header>

      {/* Content */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto', padding: 'clamp(32px, 5vw, 56px) clamp(16px, 4vw, 40px)' }}>
        <StepBar steps={STEPS} current={step} />

        {/* Error */}
        {error && (
          <div style={{ padding: '12px 18px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: '13px', fontWeight: '600', marginBottom: '24px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* STEP 0: Industry */}
        {step === 0 && (
          <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '36px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', margin: '0 0 8px', letterSpacing: '-0.03em' }}>Select Industry Type</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 28px' }}>Choose the industry to evaluate both locations against.</p>
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {industries.map(ind => (
                <button
                  key={ind}
                  onClick={() => setIndustry(ind)}
                  style={{
                    padding: '14px 18px', borderRadius: '12px', cursor: 'pointer',
                    background: industry === ind ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${industry === ind ? '#38BDF8' : 'rgba(255,255,255,0.08)'}`,
                    color: industry === ind ? '#38BDF8' : 'var(--text-secondary)',
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
              style={{ marginTop: '32px', padding: '14px 32px', borderRadius: '12px', background: industry ? 'linear-gradient(135deg, #38BDF8, #6366F1)' : 'rgba(255,255,255,0.05)', border: 'none', color: industry ? '#000' : 'var(--text-muted)', fontSize: '15px', fontWeight: '800', cursor: industry ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-sans)', transition: 'all 0.2s', boxShadow: industry ? '0 4px 20px rgba(56,189,248,0.3)' : 'none' }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* STEP 1: Location A */}
        {step === 1 && (
          <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#38BDF8', boxShadow: '0 0 8px #38BDF8' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.03em' }}>Select Location A</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Click anywhere on the map inside Gujarat to set the first location (shown in blue).</p>
              {locA && <div style={{ marginTop: '10px', fontSize: '13px', color: '#38BDF8', fontWeight: '600' }}>✓ Location A set: {locA.lat.toFixed(5)}°N, {locA.lon.toFixed(5)}°E</div>}
            </div>
            <div style={{ height: '420px', position: 'relative' }}>
              <MapComponent
                onLocationSelect={handleLocASelect}
                markers={locA ? [{ lat: locA.lat, lon: locA.lon, color: '#38BDF8', label: 'Site A' }] : []}
              />
            </div>
            <div style={{ padding: '20px 32px', display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(0)} style={{ padding: '12px 24px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                ← Back
              </button>
              <button
                disabled={!locA}
                onClick={() => setStep(2)}
                style={{ padding: '12px 28px', borderRadius: '10px', background: locA ? 'linear-gradient(135deg, #38BDF8, #6366F1)' : 'rgba(255,255,255,0.05)', border: 'none', color: locA ? '#000' : 'var(--text-muted)', fontSize: '14px', fontWeight: '800', cursor: locA ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-sans)', transition: 'all 0.2s' }}
              >
                {locA ? 'Continue to Location B →' : 'Click map to set Location A'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Location B */}
        {step === 2 && (
          <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#FB923C', boxShadow: '0 0 8px #FB923C' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.03em' }}>Select Location B</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Click anywhere inside Gujarat to set the second location (shown in orange).</p>
              {locB && <div style={{ marginTop: '10px', fontSize: '13px', color: '#FB923C', fontWeight: '600' }}>✓ Location B set: {locB.lat.toFixed(5)}°N, {locB.lon.toFixed(5)}°E</div>}
            </div>
            <div style={{ height: '420px', position: 'relative' }}>
              <MapComponent
                onLocationSelect={handleLocBSelect}
                markers={allMarkers}
              />
            </div>
            <div style={{ padding: '20px 32px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setStep(1)} style={{ padding: '12px 24px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                ← Back
              </button>
              <button
                disabled={!locB || loading}
                onClick={runComparison}
                style={{ padding: '12px 28px', borderRadius: '10px', background: locB ? 'linear-gradient(135deg, #10B981, #38BDF8)' : 'rgba(255,255,255,0.05)', border: 'none', color: locB ? '#000' : 'var(--text-muted)', fontSize: '14px', fontWeight: '800', cursor: locB ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-sans)', transition: 'all 0.2s', boxShadow: locB ? '0 4px 20px rgba(16,185,129,0.3)' : 'none' }}
              >
                {locB ? '🚀 Run Comparison' : 'Click map to set Location B'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Loading */}
        {loading && (
          <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}>
            <Spinner />
          </div>
        )}

        {/* STEP 3: Results */}
        {step === 3 && resultA && resultB && !loading && (
          <div ref={pdfRef}>
            {/* Winner banner */}
            <div style={{
              textAlign: 'center', padding: '20px', borderRadius: '16px', marginBottom: '24px',
              background: winner === 'Tie' ? 'rgba(99,102,241,0.12)' : winner === 'A' ? 'rgba(56,189,248,0.12)' : 'rgba(251,146,60,0.12)',
              border: `1px solid ${winner === 'Tie' ? 'rgba(99,102,241,0.3)' : winner === 'A' ? 'rgba(56,189,248,0.3)' : 'rgba(251,146,60,0.3)'}`,
            }}>
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>{winner === 'Tie' ? '🤝' : '🏆'}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '900', color: winner === 'Tie' ? '#6366F1' : winner === 'A' ? '#38BDF8' : '#FB923C' }}>
                {winner === 'Tie' ? "It's a Tie!" : `Location ${winner} Wins!`}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {winner !== 'Tie' ? `Δ Score: ${Math.abs(scoreA - scoreB).toFixed(1)} points` : 'Both locations score equally'}
              </div>
            </div>

            {/* Header info */}
            <div style={{ marginBottom: '16px', padding: '12px 18px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: '13px', color: 'var(--text-muted)' }}>
              Industry: <strong style={{ color: 'var(--text-primary)' }}>{formatIndustry(industry)}</strong>
              &nbsp;·&nbsp; Location A: <strong style={{ color: '#38BDF8' }}>{resultA.district || `${locA.lat.toFixed(4)}°N`}</strong>
              &nbsp;·&nbsp; Location B: <strong style={{ color: '#FB923C' }}>{resultB.district || `${locB.lat.toFixed(4)}°N`}</strong>
            </div>

            {/* Score cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              {[
                { label: 'Location A', result: resultA, color: '#38BDF8', loc: locA, score: scoreA, isWinner: winner === 'A' },
                { label: 'Location B', result: resultB, color: '#FB923C', loc: locB, score: scoreB, isWinner: winner === 'B' },
              ].map(({ label, result, color, loc, score, isWinner }) => (
                <div key={label} style={{
                  background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)',
                  border: `1.5px solid ${isWinner ? color + '60' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '18px', padding: '24px',
                  boxShadow: isWinner ? `0 0 30px ${color}20` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '16px' }}>{label}</span>
                    {isWinner && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: `${color}20`, color, border: `1px solid ${color}40`, fontWeight: '700' }}>Winner</span>}
                  </div>
                  <div style={{ marginBottom: '8px' }}><ScoreBadge score={score} /></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {result.district && <div>District: {result.district}</div>}
                    <div>{loc.lat.toFixed(5)}°N, {loc.lon.toFixed(5)}°E</div>
                    {result.lightgbm_predicted_label && <div>ML Label: <strong style={{ color: 'var(--text-secondary)' }}>{result.lightgbm_predicted_label}</strong></div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Criteria Breakdown Table */}
            {criteriaKeys.length > 0 && (
              <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '800', margin: 0 }}>Criteria Breakdown</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <th style={{ padding: '12px 18px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Criterion</th>
                        <th style={{ padding: '12px 18px', textAlign: 'center', color: '#38BDF8', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Score A</th>
                        <th style={{ padding: '12px 18px', textAlign: 'center', color: '#FB923C', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Score B</th>
                        <th style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Δ Delta</th>
                        <th style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {criteriaKeys.map((key, idx) => {
                        const cA = resultA.criteria_breakdown[key];
                        const cB = resultB.criteria_breakdown[key];
                        const sA = cA?.score_100 ?? 0;
                        const sB = cB?.score_100 ?? 0;
                        const delta = sA - sB;
                        const deltaColor = delta > 0 ? '#10B981' : delta < 0 ? '#EF4444' : 'var(--text-muted)';
                        return (
                          <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                            <td style={{ padding: '11px 18px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                              {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </td>
                            <td style={{ padding: '11px 18px', textAlign: 'center', color: '#38BDF8', fontWeight: '700' }}>{Number(sA).toFixed(1)}</td>
                            <td style={{ padding: '11px 18px', textAlign: 'center', color: '#FB923C', fontWeight: '700' }}>{Number(sB).toFixed(1)}</td>
                            <td style={{ padding: '11px 18px', textAlign: 'center', color: deltaColor, fontWeight: '700' }}>
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
            <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '800', margin: '0 0 20px' }}>Score Visualization</h3>
              {criteriaKeys.slice(0, 8).map(key => {
                const sA = resultA.criteria_breakdown[key]?.score_100 ?? 0;
                const sB = resultB.criteria_breakdown[key]?.score_100 ?? 0;
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                return (
                  <div key={key} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      <span>{label}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>A: {Number(sA).toFixed(1)} · B: {Number(sB).toFixed(1)}</span>
                    </div>
                    <div style={{ position: 'relative', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '4px' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(sA, 100)}%`, background: 'linear-gradient(90deg, #38BDF8, #6366F1)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ position: 'relative', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(sB, 100)}%`, background: 'linear-gradient(90deg, #FB923C, #F59E0B)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div style={{ width: '24px', height: '8px', background: 'linear-gradient(90deg, #38BDF8, #6366F1)', borderRadius: '4px' }} />
                  Location A
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div style={{ width: '24px', height: '8px', background: 'linear-gradient(90deg, #FB923C, #F59E0B)', borderRadius: '4px' }} />
                  Location B
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/compare')} style={{ padding: '12px 24px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                ← Back to Compare Hub
              </button>
              <button onClick={() => { setStep(0); setLocA(null); setLocB(null); setResultA(null); setResultB(null); setError(''); }} style={{ padding: '12px 24px', borderRadius: '10px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#38BDF8', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                New Comparison
              </button>
              <button onClick={handleExportPDF} style={{ padding: '12px 24px', borderRadius: '10px', background: 'linear-gradient(135deg, #10B981, #38BDF8)', border: 'none', color: '#000', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
                📄 Export PDF
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
