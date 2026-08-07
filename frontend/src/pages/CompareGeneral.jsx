import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/Map/MapComponent';
import { predictSite, getIndustryTypes } from '../api/analysis';
import { isInsideGujarat } from '../utils/locationValidation';
import html2pdf from 'html2pdf.js';

function fmt(val) {
  return (val || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

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
              fontSize: '11px', fontWeight: '900', flexShrink: 0,
              color: i < current ? '#fff' : i === current ? '#38BDF8' : 'var(--text-muted)',
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

// Palette for industries (cycles if >8)
const IND_COLORS = ['#38BDF8','#A855F7','#10B981','#F59E0B','#EF4444','#EC4899','#6366F1','#14B8A6'];
const LOC_COLORS = ['#10B981','#F59E0B','#38BDF8','#A855F7','#EF4444'];

function getScoreColor(s) {
  return s >= 75 ? '#10B981' : s >= 55 ? '#22D3EE' : s >= 35 ? '#F59E0B' : '#EF4444';
}
function getScoreLabel(s) {
  return s >= 75 ? 'Excellent' : s >= 55 ? 'Good' : s >= 35 ? 'Moderate' : 'Poor';
}

export default function CompareGeneral() {
  const navigate = useNavigate();
  const pdfRef = useRef(null);
  const STEPS = ['Industries', 'Location A', 'Location B', 'Run Matrix'];

  const [step, setStep] = useState(0);
  const [allIndustries, setAllIndustries] = useState([]);
  // selectedIndustries: array of strings
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [locA, setLocA] = useState(null);
  const [locB, setLocB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // matrix: rows=[locA, locB], cols=selectedIndustries
  // matrix[locIdx][indIdx] = result object
  const [matrix, setMatrix] = useState(null);

  useEffect(() => {
    getIndustryTypes()
      .then(types => {
        setAllIndustries(types);
        // default: first 2 selected
        setSelectedIndustries(types.slice(0, 2));
      })
      .catch(() => {});
  }, []);

  const toggleIndustry = (ind) => {
    setSelectedIndustries(prev =>
      prev.includes(ind)
        ? prev.length <= 1 ? prev // keep at least 1
          : prev.filter(i => i !== ind)
        : [...prev, ind]
    );
  };

  const handleLocASelect = ({ lat, lon }) => {
    if (!isInsideGujarat(lat, lon)) { setError('Location A is outside Gujarat.'); return; }
    setError(''); setLocA({ lat, lon });
  };
  const handleLocBSelect = ({ lat, lon }) => {
    if (!isInsideGujarat(lat, lon)) { setError('Location B is outside Gujarat.'); return; }
    setError(''); setLocB({ lat, lon });
  };

  const runMatrix = async () => {
    if (selectedIndustries.length < 2) { setError('Please select at least 2 industries.'); return; }
    setError(''); setLoading(true);
    try {
      // Build all promises: rows=[locA, locB], cols=selectedIndustries
      const locs = [locA, locB];
      const promises = locs.flatMap(loc =>
        selectedIndustries.map(ind =>
          predictSite({ latitude: loc.lat, longitude: loc.lon, industryType: ind })
        )
      );
      const flat = await Promise.all(promises);
      const nInd = selectedIndustries.length;
      // reshape: matrix[locIdx][indIdx]
      const mat = [
        flat.slice(0, nInd),
        flat.slice(nInd, nInd * 2),
      ];
      setMatrix(mat);
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
      margin: 10, filename: 'compare-matrix.pdf',
      html2canvas: { scale: 2 }, jsPDF: { orientation: 'landscape', format: 'a4' },
    }).from(pdfRef.current).save();
  };

  // Derived
  const getScore = (r) => r?.mcda_final_suitability_score ?? 0;
  const scores = matrix
    ? matrix.map(row => row.map(res => getScore(res)))
    : null;
  const allScores = scores ? scores.flat() : [];
  const bestScore = allScores.length ? Math.max(...allScores) : 0;
  const isBest = (r, c) => scores && scores[r][c] === bestScore;

  const allMarkers = [
    ...(locA ? [{ lat: locA.lat, lon: locA.lon, color: LOC_COLORS[0], label: 'Site A' }] : []),
    ...(locB ? [{ lat: locB.lat, lon: locB.lon, color: LOC_COLORS[1], label: 'Site B' }] : []),
  ];

  const canProceed0 = selectedIndustries.length >= 2;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      {/* BG */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 50% at 10% 10%, rgba(16,185,129,0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 90% 90%, rgba(245,158,11,0.07) 0%, transparent 55%)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.10, backgroundImage: 'radial-gradient(rgba(16,185,129,0.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Nav */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, height: '64px', display: 'flex', alignItems: 'center', padding: '0 clamp(16px, 4vw, 40px)', background: 'rgba(3, 7, 18, 0.85)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.07)', gap: '16px' }}>
        <button
          onClick={() => navigate('/compare')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '7px 14px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-sans)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; e.currentTarget.style.color = '#10B981'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Compare Hub
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '17px', letterSpacing: '-0.03em' }}>
          <span style={{ background: 'linear-gradient(135deg, #10B981, #38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Matrix</span>
          <span style={{ color: 'var(--text-primary)' }}> Compare</span>
        </span>
        {selectedIndustries.length >= 2 && (
          <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
            <span style={{ color: '#10B981', fontWeight: '800' }}>{selectedIndustries.length}</span> industries × <span style={{ color: '#F59E0B', fontWeight: '800' }}>2</span> locations
          </div>
        )}
      </header>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: 'clamp(32px, 5vw, 56px) clamp(16px, 4vw, 40px)' }}>
        <StepBar steps={STEPS} current={step} />

        {error && (
          <div style={{ padding: '12px 18px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: '13px', fontWeight: '600', marginBottom: '24px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── STEP 0: Industry Multi-Select ── */}
        {step === 0 && (
          <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '800', margin: '0 0 6px', letterSpacing: '-0.03em' }}>Select Industries</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                  Select <b>2 or more</b> industry types to compare across both locations.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '7px 16px', borderRadius: '20px',
                  background: canProceed0 ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${canProceed0 ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: canProceed0 ? '#10B981' : 'var(--text-muted)',
                  fontSize: '13px', fontWeight: '800',
                }}>
                  {selectedIndustries.length} selected
                </div>
                {selectedIndustries.length > 0 && (
                  <button
                    onClick={() => setSelectedIndustries([])}
                    style={{ padding: '7px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Selected pills */}
            {selectedIndustries.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px', marginBottom: '20px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', alignSelf: 'center', marginRight: '4px' }}>Selected:</span>
                {selectedIndustries.map((ind, idx) => (
                  <div key={ind} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px', borderRadius: '20px',
                    background: `${IND_COLORS[idx % IND_COLORS.length]}18`,
                    border: `1px solid ${IND_COLORS[idx % IND_COLORS.length]}40`,
                    color: IND_COLORS[idx % IND_COLORS.length],
                    fontSize: '11px', fontWeight: '700',
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: IND_COLORS[idx % IND_COLORS.length], display: 'inline-block' }} />
                    {fmt(ind)}
                    <button
                      onClick={() => toggleIndustry(ind)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0 0 0 2px', lineHeight: 1, fontSize: '13px', opacity: 0.7 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {/* All industry grid */}
            <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', marginTop: selectedIndustries.length > 0 ? '0' : '20px' }}>
              {allIndustries.map((ind) => {
                const selIdx = selectedIndustries.indexOf(ind);
                const isSelected = selIdx !== -1;
                const color = isSelected ? IND_COLORS[selIdx % IND_COLORS.length] : null;
                return (
                  <button
                    key={ind}
                    onClick={() => toggleIndustry(ind)}
                    style={{
                      padding: '11px 14px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                      background: isSelected ? `${color}15` : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${isSelected ? color : 'rgba(255,255,255,0.08)'}`,
                      color: isSelected ? color : 'var(--text-secondary)',
                      fontSize: '12px', fontWeight: '700', fontFamily: 'var(--font-sans)',
                      transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}
                    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; } }}
                    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; } }}
                  >
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                      background: isSelected ? color : 'rgba(255,255,255,0.07)',
                      border: `1.5px solid ${isSelected ? color : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', color: '#fff',
                    }}>
                      {isSelected ? '✓' : ''}
                    </div>
                    <span style={{ flex: 1, lineHeight: 1.35 }}>{fmt(ind)}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '28px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button
                disabled={!canProceed0}
                onClick={() => { setError(''); setStep(1); }}
                style={{
                  padding: '12px 28px', borderRadius: '10px',
                  background: canProceed0 ? 'linear-gradient(135deg, #10B981, #38BDF8)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: canProceed0 ? '#000' : 'var(--text-muted)',
                  fontSize: '14px', fontWeight: '800',
                  cursor: canProceed0 ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
                  boxShadow: canProceed0 ? '0 4px 20px rgba(16,185,129,0.3)' : 'none',
                }}
              >
                Continue → ({selectedIndustries.length} industries selected)
              </button>
              {!canProceed0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Select at least 2 industries to continue</span>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 1: Location A ── */}
        {step === 1 && (
          <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: LOC_COLORS[0], boxShadow: `0 0 8px ${LOC_COLORS[0]}` }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '800', margin: 0 }}>Select Location A</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Click inside Gujarat to set the first comparison site.</p>
              {locA && <div style={{ marginTop: '8px', fontSize: '13px', color: LOC_COLORS[0], fontWeight: '600' }}>✓ {locA.lat.toFixed(5)}°N, {locA.lon.toFixed(5)}°E</div>}
            </div>
            <div style={{ height: '420px' }}>
              <MapComponent
                onLocationSelect={handleLocASelect}
                markers={locA ? [{ lat: locA.lat, lon: locA.lon, color: LOC_COLORS[0], label: 'Site A' }] : []}
              />
            </div>
            <div style={{ padding: '18px 28px', display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(0)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>← Back</button>
              <button
                disabled={!locA}
                onClick={() => setStep(2)}
                style={{ padding: '10px 24px', borderRadius: '10px', background: locA ? 'linear-gradient(135deg, #10B981, #38BDF8)' : 'rgba(255,255,255,0.05)', border: 'none', color: locA ? '#000' : 'var(--text-muted)', fontSize: '13px', fontWeight: '800', cursor: locA ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-sans)', transition: 'all 0.2s' }}
              >
                {locA ? 'Continue to Location B →' : 'Click map to set Location A'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Location B ── */}
        {step === 2 && (
          <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: LOC_COLORS[1], boxShadow: `0 0 8px ${LOC_COLORS[1]}` }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '800', margin: 0 }}>Select Location B</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Click inside Gujarat to set the second comparison site.</p>
              {locB && <div style={{ marginTop: '8px', fontSize: '13px', color: LOC_COLORS[1], fontWeight: '600' }}>✓ {locB.lat.toFixed(5)}°N, {locB.lon.toFixed(5)}°E</div>}
            </div>
            <div style={{ height: '420px' }}>
              <MapComponent onLocationSelect={handleLocBSelect} markers={allMarkers} />
            </div>
            <div style={{ padding: '18px 28px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setStep(1)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>← Back</button>
              <button
                disabled={!locB || loading}
                onClick={runMatrix}
                style={{
                  padding: '10px 24px', borderRadius: '10px',
                  background: locB ? 'linear-gradient(135deg, #F59E0B, #10B981)' : 'rgba(255,255,255,0.05)',
                  border: 'none', color: locB ? '#000' : 'var(--text-muted)',
                  fontSize: '13px', fontWeight: '800', cursor: locB ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
                  boxShadow: locB ? '0 4px 20px rgba(245,158,11,0.25)' : 'none',
                }}
              >
                {locB ? `🚀 Run ${selectedIndustries.length}×2 Matrix` : 'Click map to set Location B'}
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <svg width="52" height="52" viewBox="0 0 52 52" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="3" />
              <circle cx="26" cy="26" r="22" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray="44 94" strokeLinecap="round" />
            </svg>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600', margin: 0 }}>
              Running {selectedIndustries.length * 2} predictions…
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
              {selectedIndustries.map((ind, idx) => (
                <span key={ind} style={{ padding: '3px 10px', borderRadius: '20px', background: `${IND_COLORS[idx % IND_COLORS.length]}18`, border: `1px solid ${IND_COLORS[idx % IND_COLORS.length]}30`, color: IND_COLORS[idx % IND_COLORS.length], fontSize: '11px', fontWeight: '700' }}>
                  {fmt(ind)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: Matrix Results ── */}
        {step === 3 && matrix && !loading && (() => {
          const nInd = selectedIndustries.length;
          const locs = [locA, locB];
          const locLabels = ['Location A', 'Location B'];

          // Find best cell
          let bestR = 0, bestC = 0;
          for (let r = 0; r < 2; r++) for (let c = 0; c < nInd; c++) {
            if (scores[r][c] > scores[bestR][bestC]) { bestR = r; bestC = c; }
          }
          const bestResult = matrix[bestR][bestC];
          const bestIndustry = selectedIndustries[bestC];
          const bestLocLabel = locLabels[bestR];

          return (
            <div>
              {/* Summary chips */}
              <div style={{ marginBottom: '20px', padding: '14px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', fontSize: '12px' }}>
                {selectedIndustries.map((ind, idx) => (
                  <span key={ind}>
                    <span style={{ color: 'var(--text-muted)' }}>Ind {idx + 1}: </span>
                    <strong style={{ color: IND_COLORS[idx % IND_COLORS.length] }}>{fmt(ind)}</strong>
                  </span>
                ))}
                <span style={{ opacity: 0.3 }}>·</span>
                {locs.map((loc, idx) => (
                  <span key={idx}>
                    <span style={{ color: 'var(--text-muted)' }}>Loc {String.fromCharCode(65 + idx)}: </span>
                    <strong style={{ color: LOC_COLORS[idx] }}>{matrix[idx][0]?.district || `${loc.lat.toFixed(3)}°N`}</strong>
                  </span>
                ))}
              </div>

              <div ref={pdfRef}>
                {/* N×2 Matrix Grid */}
                <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', overflow: 'hidden', marginBottom: '24px' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '800', margin: 0 }}>
                        {nInd}×2 Suitability Matrix
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0' }}>
                        <span style={{ color: '#10B981', fontWeight: '700' }}>★ Best cell</span> highlighted · {nInd} industries × 2 locations = <strong>{nInd * 2} predictions</strong>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {LOC_COLORS.slice(0, 2).map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: c, fontWeight: '700' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c }} />
                          Loc {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${200 + nInd * 130}px` }}>
                      <thead>
                        <tr>
                          {/* Row label col */}
                          <th style={{ padding: '14px 18px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', width: '150px' }}>↘ Industry</th>
                          {selectedIndustries.map((ind, cidx) => (
                            <th key={ind} style={{ padding: '14px 14px', textAlign: 'center', color: IND_COLORS[cidx % IND_COLORS.length], fontWeight: '700', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                              <div style={{ marginBottom: '2px' }}>Ind {cidx + 1}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', maxWidth: '120px', margin: '0 auto' }}>{fmt(ind)}</div>
                              {/* Col winner */}
                              <div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: '500', marginTop: '4px' }}>
                                Best: {scores[0][cidx] >= scores[1][cidx] ? 'Loc A' : 'Loc B'} ({Math.max(scores[0][cidx], scores[1][cidx]).toFixed(1)})
                              </div>
                            </th>
                          ))}
                          <th style={{ padding: '14px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '700', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>Row Best</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locs.map((loc, ridx) => {
                          const rowScores = scores[ridx];
                          const rowBestScore = Math.max(...rowScores);
                          const rowBestIndIdx = rowScores.indexOf(rowBestScore);
                          return (
                            <tr key={ridx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '16px 18px', fontWeight: '800', fontSize: '13px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: LOC_COLORS[ridx], flexShrink: 0, boxShadow: `0 0 6px ${LOC_COLORS[ridx]}` }} />
                                  <div>
                                    <div style={{ color: LOC_COLORS[ridx] }}>Location {String.fromCharCode(65 + ridx)}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: '500' }}>{loc.lat.toFixed(3)}°N</div>
                                  </div>
                                </div>
                              </td>
                              {rowScores.map((s, cidx) => {
                                const best = isBest(ridx, cidx);
                                const sColor = getScoreColor(s);
                                const res = matrix[ridx][cidx];
                                return (
                                  <td key={cidx} style={{
                                    padding: '14px 12px', textAlign: 'center',
                                    background: best ? 'rgba(16,185,129,0.08)' : 'transparent',
                                    boxShadow: best ? 'inset 0 0 0 2px rgba(16,185,129,0.4)' : 'none',
                                    transition: 'all 0.2s',
                                  }}>
                                    {best && <div style={{ fontSize: '9px', color: '#10B981', fontWeight: '800', marginBottom: '3px', letterSpacing: '0.08em' }}>★ BEST</div>}
                                    <div style={{ fontSize: '20px', fontWeight: '900', color: sColor, marginBottom: '1px' }}>{Number(s).toFixed(1)}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>/100</div>
                                    {res?.lightgbm_predicted_label && (
                                      <div style={{ marginTop: '5px', fontSize: '9px', padding: '2px 7px', borderRadius: '10px', background: `${sColor}15`, color: sColor, border: `1px solid ${sColor}30`, display: 'inline-block', fontWeight: '700' }}>
                                        {res.lightgbm_predicted_label}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                              {/* Row best */}
                              <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', fontWeight: '800', color: IND_COLORS[rowBestIndIdx % IND_COLORS.length], padding: '3px 8px', borderRadius: '8px', background: `${IND_COLORS[rowBestIndIdx % IND_COLORS.length]}15`, border: `1px solid ${IND_COLORS[rowBestIndIdx % IND_COLORS.length]}30`, display: 'inline-block', whiteSpace: 'nowrap' }}>
                                  Ind {rowBestIndIdx + 1} ({rowBestScore.toFixed(1)})
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Score bars — all N×2 combos */}
                <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '24px', marginBottom: '24px' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '800', margin: '0 0 20px' }}>All Scores — Visual Comparison</h3>
                  {locs.map((loc, ridx) => (
                    <div key={ridx} style={{ marginBottom: ridx < 1 ? '20px' : 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: LOC_COLORS[ridx], marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: LOC_COLORS[ridx] }} />
                        Location {String.fromCharCode(65 + ridx)} — {matrix[ridx][0]?.district || `${loc.lat.toFixed(3)}°N`}
                      </div>
                      {selectedIndustries.map((ind, cidx) => {
                        const s = scores[ridx][cidx];
                        const clr = IND_COLORS[cidx % IND_COLORS.length];
                        const best = isBest(ridx, cidx);
                        return (
                          <div key={ind} style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: clr, display: 'inline-block' }} />
                                {fmt(ind)}
                                {best && <span style={{ fontSize: '10px', color: '#10B981', fontWeight: '800' }}>★ BEST</span>}
                              </span>
                              <span style={{ color: getScoreColor(s), fontWeight: '800' }}>{Number(s).toFixed(1)} / 100</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(s, 100)}%`, background: best ? `linear-gradient(90deg, ${clr}, #10B981)` : clr, borderRadius: '4px', transition: 'width 0.8s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Best combination detail */}
                <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 0 40px rgba(16,185,129,0.1)' }}>
                  <div style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.15), transparent)', padding: '20px 24px', borderBottom: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>🏆</span>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '900', margin: 0, color: '#10B981' }}>Best Combination</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '2px 0 0' }}>
                        {bestLocLabel} × {fmt(bestIndustry)} — Score: {Number(scores[bestR][bestC]).toFixed(1)}/100
                      </p>
                    </div>
                  </div>
                  {Object.keys(bestResult?.criteria_breakdown || {}).length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '10px 18px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Criterion</th>
                            <th style={{ padding: '10px 18px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Raw Value</th>
                            <th style={{ padding: '10px 18px', textAlign: 'center', color: '#10B981', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Score /100</th>
                            <th style={{ padding: '10px 18px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Weight</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(bestResult.criteria_breakdown).map(([key, c], idx) => (
                            <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: idx % 2 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                              <td style={{ padding: '9px 18px', color: 'var(--text-secondary)', fontWeight: '600' }}>{key.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}</td>
                              <td style={{ padding: '9px 18px', textAlign: 'center', color: 'var(--text-muted)' }}>{typeof c?.raw === 'number' ? Number(c.raw).toFixed(2) : c?.raw ?? '—'}</td>
                              <td style={{ padding: '9px 18px', textAlign: 'center', color: '#10B981', fontWeight: '700' }}>{Number(c?.score_100 ?? 0).toFixed(1)}</td>
                              <td style={{ padding: '9px 18px', textAlign: 'center', color: 'var(--text-muted)' }}>{((c?.weight ?? 0) * 100).toFixed(0)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/compare')} style={{ padding: '12px 24px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>← Compare Hub</button>
                <button onClick={() => { setStep(0); setLocA(null); setLocB(null); setMatrix(null); setError(''); }} style={{ padding: '12px 24px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>New Matrix</button>
                <button onClick={handleExportPDF} style={{ padding: '12px 24px', borderRadius: '10px', background: 'linear-gradient(135deg, #10B981, #38BDF8)', border: 'none', color: '#000', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>📄 Export PDF</button>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
