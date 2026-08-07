import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/Map/MapComponent';
import { predictSite, getIndustryTypes } from '../api/analysis';
import { isInsideGujarat } from '../utils/locationValidation';
import html2pdf from 'html2pdf.js';
import Layout from '../components/Common/Layout';

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
            color: i < current ? 'var(--c-success)' : i === current ? 'var(--cyan)' : 'var(--text-muted)',
            fontWeight: i === current ? '800' : '600',
            fontSize: '13px', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
          }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: i < current ? 'var(--c-success)' : i === current ? 'rgba(56,189,248,0.2)' : 'var(--text-muted)',
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

// Palette for industries
const IND_COLORS = ['var(--c-primary-500)','var(--c-primary-500)','var(--c-success)','#F59E0B','var(--c-error)','#EC4899','#6366F1','#14B8A6'];
const LOC_COLORS = ['var(--c-success)','#F59E0B','var(--c-primary-500)','var(--c-primary-500)','var(--c-error)'];

function getScoreColor(s) {
  return s >= 75 ? 'var(--c-success)' : s >= 55 ? '#22D3EE' : s >= 35 ? '#F59E0B' : 'var(--c-error)';
}

export default function CompareGeneral() {
  const navigate = useNavigate();
  const pdfRef = useRef(null);
  const STEPS = ['Industries', 'Location A', 'Location B', 'Run Matrix'];

  const [step, setStep] = useState(0);
  const [allIndustries, setAllIndustries] = useState([]);
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [locA, setLocA] = useState(null);
  const [locB, setLocB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matrix, setMatrix] = useState(null);

  useEffect(() => {
    getIndustryTypes()
      .then(types => {
        setAllIndustries(types);
        setSelectedIndustries(types.slice(0, 2));
      })
      .catch(() => {});
  }, []);

  const toggleIndustry = (ind) => {
    setSelectedIndustries(prev =>
      prev.includes(ind)
        ? prev.length <= 1 ? prev : prev.filter(i => i !== ind)
        : [...prev, ind]
    );
  };

  const handleLocASelect = ({ lat, lon }) => {
    if (!isInsideGujarat(lat, lon)) { setError('Location A coordinates are outside Gujarat state borders.'); return; }
    setError(''); setLocA({ lat, lon });
  };
  const handleLocBSelect = ({ lat, lon }) => {
    if (!isInsideGujarat(lat, lon)) { setError('Location B coordinates are outside Gujarat state borders.'); return; }
    setError(''); setLocB({ lat, lon });
  };

  const runMatrix = async () => {
    if (selectedIndustries.length < 2) { setError('Please select at least 2 industries.'); return; }
    setError(''); setLoading(true);
    try {
      const locs = [locA, locB];
      const promises = locs.flatMap(loc =>
        selectedIndustries.map(ind =>
          predictSite({ latitude: loc.lat, longitude: loc.lon, industryType: ind })
        )
      );
      const flat = await Promise.all(promises);
      const nInd = selectedIndustries.length;
      const mat = [
        flat.slice(0, nInd),
        flat.slice(nInd, nInd * 2),
      ];
      setMatrix(mat);
      setStep(3);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Matrix calculation failed.');
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

  const getScore = (r) => r?.mcda_final_suitability_score ?? 0;
  const scores = matrix ? matrix.map(row => row.map(res => getScore(res))) : null;
  const allScores = scores ? scores.flat() : [];
  const bestScore = allScores.length ? Math.max(...allScores) : 0;
  const isBest = (r, c) => scores && scores[r][c] === bestScore;

  const allMarkers = [
    ...(locA ? [{ lat: locA.lat, lon: locA.lon, color: LOC_COLORS[0], label: 'Site A' }] : []),
    ...(locB ? [{ lat: locB.lat, lon: locB.lon, color: LOC_COLORS[1], label: 'Site B' }] : []),
  ];

  const canProceed0 = selectedIndustries.length >= 2;

  return (
    <Layout>
      {/* Subheader */}
      <div style={{
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '12px clamp(16px, 4vw, 40px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <button
            onClick={() => navigate('/compare')}
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12.5px' }}
          >
            ← Compare Hub
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: '850', fontSize: '17px', letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--c-success)' }}>Matrix</span>
            <span style={{ color: 'var(--text-primary)' }}> Compare</span>
          </span>
          {selectedIndustries.length >= 2 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px',
              background: 'var(--c-surface)', border: '1px solid rgba(16,185,129,0.22)',
              borderRadius: '20px', fontSize: '11.5px', color: 'var(--c-success)', fontWeight: '750'
            }}>
              <b>{selectedIndustries.length}</b> sectors × <b>2</b> locations
            </div>
          )}
        </div>
      </div>

      <main style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: 'clamp(24px,4vw,48px) clamp(16px,4vw,40px)' }} className="anim-fadeIn">
        <StepBar steps={STEPS} current={step} />

        {error && (
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'var(--c-surface)', border: '1px solid rgba(244,63,94,0.22)', color: 'var(--c-error)', fontSize: '13.5px', fontWeight: '750', marginBottom: '24px', textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        )}

        {/* STEP 0: Industry Multi-Select */}
        {step === 0 && (
          <div className="glass-bright" style={{ borderRadius: '20px', padding: '36px clamp(16px, 4vw, 36px)', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '900', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Select Comparison Sectors</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', margin: 0 }}>Select <b>2 or more</b> industries to construct the evaluation matrix grid.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  padding: '6px 14px', borderRadius: '20px',
                  background: canProceed0 ? 'rgba(16,185,129,0.06)' : 'var(--text-muted)',
                  border: `1px solid ${canProceed0 ? 'rgba(16,185,129,0.22)' : 'var(--text-muted)'}`,
                  color: canProceed0 ? 'var(--c-success)' : 'var(--text-muted)',
                  fontSize: '12px', fontWeight: '800',
                }}>
                  {selectedIndustries.length} Selected
                </div>
                {selectedIndustries.length > 0 && (
                  <button
                    onClick={() => setSelectedIndustries([])}
                    className="btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '11.5px', color: 'var(--c-error)', borderColor: 'rgba(239,68,68,0.22)' }}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {selectedIndustries.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px', marginBottom: '20px', padding: '14px 16px', borderRadius: '12px', background: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', alignSelf: 'center', marginRight: '4px' }}>Query Matrix:</span>
                {selectedIndustries.map((ind, idx) => (
                  <div key={ind} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px', borderRadius: '20px',
                    background: `${IND_COLORS[idx % IND_COLORS.length]}15`,
                    border: `1px solid ${IND_COLORS[idx % IND_COLORS.length]}30`,
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

            <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
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
                      background: isSelected ? `${color}15` : 'var(--text-muted)',
                      border: `1.5px solid ${isSelected ? color : 'var(--text-muted)'}`,
                      color: isSelected ? color : 'var(--text-secondary)',
                      fontSize: '12px', fontWeight: '700', fontFamily: 'var(--font-sans)',
                      transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}
                  >
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                      background: isSelected ? color : 'var(--text-muted)',
                      border: `1.5px solid ${isSelected ? color : 'var(--text-muted)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', color: 'var(--text-primary)',
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
                className="btn-primary"
                style={{ padding: '12px 28px' }}
              >
                Continue → ({selectedIndustries.length} Selected)
              </button>
              {!canProceed0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Select at least 2 industries to continue</span>
              )}
            </div>
          </div>
        )}

        {/* STEP 1: Location A */}
        {step === 1 && (
          <div className="glass-bright" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
            <div style={{ padding: '24px clamp(16px, 4vw, 32px) 18px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: LOC_COLORS[0], boxShadow: `0 0 8px ${LOC_COLORS[0]}` }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>Select Location A</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', margin: 0 }}>Click anywhere inside Gujarat state borders to set the first comparison coordinates.</p>
              {locA && <div style={{ marginTop: '8px', fontSize: '13px', color: LOC_COLORS[0], fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>✓ Coords A: {locA.lat.toFixed(5)}°N, {locA.lon.toFixed(5)}°E</div>}
            </div>
            <div style={{ height: '420px', position: 'relative' }}>
              <MapComponent
                onLocationSelect={handleLocASelect}
                markers={locA ? [{ lat: locA.lat, lon: locA.lon, color: LOC_COLORS[0], label: 'Site A' }] : []}
              />
            </div>
            <div style={{ padding: '18px clamp(16px, 4vw, 32px)', display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(0)} className="btn-ghost" style={{ padding: '10px 20px' }}>← Back</button>
              <button
                disabled={!locA}
                onClick={() => setStep(2)}
                className="btn-primary"
                style={{ padding: '10px 24px' }}
              >
                Continue to Location B →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Location B */}
        {step === 2 && (
          <div className="glass-bright" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
            <div style={{ padding: '24px clamp(16px, 4vw, 32px) 18px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: LOC_COLORS[1], boxShadow: `0 0 8px ${LOC_COLORS[1]}` }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>Select Location B</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', margin: 0 }}>Click anywhere inside Gujarat state borders to set the second comparison coordinates.</p>
              {locB && <div style={{ marginTop: '8px', fontSize: '13px', color: LOC_COLORS[1], fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>✓ Coords B: {locB.lat.toFixed(5)}°N, {locB.lon.toFixed(5)}°E</div>}
            </div>
            <div style={{ height: '420px', position: 'relative' }}>
              <MapComponent onLocationSelect={handleLocBSelect} markers={allMarkers} />
            </div>
            <div style={{ padding: '18px clamp(16px, 4vw, 32px)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setStep(1)} className="btn-ghost" style={{ padding: '10px 20px' }}>← Back</button>
              <button
                disabled={!locB || loading}
                onClick={runMatrix}
                className="btn-primary"
                style={{ padding: '10px 24px' }}
              >
                Run {selectedIndustries.length}×2 Suitability Matrix
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="glass-bright" style={{ borderRadius: '20px', padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', border: '1px solid var(--border-default)' }}>
            <svg width="52" height="52" viewBox="0 0 52 52" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth="3" />
              <circle cx="26" cy="26" r="22" fill="none" stroke="var(--c-success)" strokeWidth="3" strokeDasharray="44 94" strokeLinecap="round" />
            </svg>
            <p style={{ color: 'var(--text-muted)', fontSize: '14.5px', fontWeight: '650', margin: 0 }}>
              Computing suitability index values for {selectedIndustries.length * 2} configurations...
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
              {selectedIndustries.map((ind, idx) => (
                <span key={ind} style={{ padding: '4px 10px', borderRadius: '20px', background: `${IND_COLORS[idx % IND_COLORS.length]}12`, border: `1px solid ${IND_COLORS[idx % IND_COLORS.length]}22`, color: IND_COLORS[idx % IND_COLORS.length], fontSize: '11px', fontWeight: '700' }}>
                  {fmt(ind)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Matrix Results */}
        {step === 3 && matrix && !loading && (() => {
          const nInd = selectedIndustries.length;
          const locs = [locA, locB];
          const locLabels = ['Location A', 'Location B'];

          let bestR = 0, bestC = 0;
          for (let r = 0; r < 2; r++) for (let c = 0; c < nInd; c++) {
            if (scores[r][c] > scores[bestR][bestC]) { bestR = r; bestC = c; }
          }
          const bestResult = matrix[bestR][bestC];
          const bestIndustry = selectedIndustries[bestC];
          const bestLocLabel = locLabels[bestR];

          return (
            <div className="anim-fadeIn">
              <div style={{ marginBottom: '20px', padding: '14px 20px', borderRadius: '12px', background: 'var(--text-muted)', border: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', fontSize: '12px' }}>
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
                {/* Decision matrix table grid */}
                <div style={{ background: 'var(--c-surface)', border: '1px solid var(--text-muted)', borderRadius: '20px', overflow: 'hidden', marginBottom: '32px' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '850', margin: 0 }}>
                        {nInd}×2 Decision Evaluation Grid
                      </h3>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${200 + nInd * 130}px` }} className="responsive-table">
                      <thead>
                        <tr style={{ background: 'var(--text-muted)' }}>
                          <th style={{ padding: '14px 18px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '750', fontSize: '12px', borderBottom: '1px solid var(--text-muted)', width: '150px' }}>↘ Industry</th>
                          {selectedIndustries.map((ind, cidx) => (
                            <th key={ind} style={{ padding: '14px 14px', textAlign: 'center', color: IND_COLORS[cidx % IND_COLORS.length], fontWeight: '750', fontSize: '12px', borderBottom: '1px solid var(--text-muted)' }}>
                              <div style={{ marginBottom: '2px' }}>Ind {cidx + 1}</div>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600', maxWidth: '120px', margin: '0 auto' }}>{fmt(ind)}</div>
                              <div style={{ fontSize: '9.5px', color: 'var(--text-faint)', fontWeight: '600', marginTop: '4px' }}>
                                Best: {scores[0][cidx] >= scores[1][cidx] ? 'Loc A' : 'Loc B'} ({Math.max(scores[0][cidx], scores[1][cidx]).toFixed(1)})
                              </div>
                            </th>
                          ))}
                          <th style={{ padding: '14px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '750', fontSize: '12px', borderBottom: '1px solid var(--text-muted)' }}>Row Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locs.map((loc, ridx) => {
                          const rowScores = scores[ridx];
                          const rowBestScore = Math.max(...rowScores);
                          const rowBestIndIdx = rowScores.indexOf(rowBestScore);
                          return (
                            <tr key={ridx} style={{ borderBottom: '1px solid var(--text-muted)' }}>
                              <td style={{ padding: '16px 18px', fontWeight: '800', fontSize: '13px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: LOC_COLORS[ridx], flexShrink: 0, boxShadow: `0 0 6px ${LOC_COLORS[ridx]}` }} />
                                  <div>
                                    <div style={{ color: LOC_COLORS[ridx], fontWeight: '850' }}>Location {String.fromCharCode(65 + ridx)}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>{loc.lat.toFixed(3)}°N</div>
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
                                    background: best ? 'rgba(16,185,129,0.04)' : 'transparent',
                                    boxShadow: best ? 'inset 0 0 0 1.5px rgba(16,185,129,0.3)' : 'none',
                                    transition: 'all 0.2s',
                                  }}>
                                    {best && <div style={{ fontSize: '9px', color: 'var(--c-success)', fontWeight: '850', marginBottom: '3px', letterSpacing: '0.08em' }}>★ BEST</div>}
                                    <div style={{ fontSize: '20px', fontWeight: '950', color: sColor, marginBottom: '1px' }}>{Number(s).toFixed(1)}</div>
                                    {res?.lightgbm_predicted_label && (
                                      <div style={{ marginTop: '5px', fontSize: '9.5px', padding: '2px 7px', borderRadius: '10px', background: `${sColor}12`, color: sColor, border: `1px solid ${sColor}22`, display: 'inline-block', fontWeight: '750' }}>
                                        {res.lightgbm_predicted_label}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                              <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', fontWeight: '800', color: IND_COLORS[rowBestIndIdx % IND_COLORS.length], padding: '3px 8px', borderRadius: '8px', background: `${IND_COLORS[rowBestIndIdx % IND_COLORS.length]}12`, border: `1px solid ${IND_COLORS[rowBestIndIdx % IND_COLORS.length]}22`, display: 'inline-block', whiteSpace: 'nowrap' }}>
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

                {/* Score bars visual grid */}
                <div className="glass-bright" style={{ borderRadius: '20px', padding: '24px clamp(16px, 4vw, 24px)', border: '1px solid var(--border-default)', marginBottom: '32px' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '850', margin: '0 0 20px' }}>Matrix Visual Comparative Index</h3>
                  {locs.map((loc, ridx) => (
                    <div key={ridx} style={{ marginBottom: ridx < 1 ? '24px' : 0 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: '800', color: LOC_COLORS[ridx], marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
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
                                {best && <span style={{ fontSize: '10px', color: 'var(--c-success)', fontWeight: '800' }}>★ BEST CELL</span>}
                              </span>
                              <span style={{ color: getScoreColor(s), fontWeight: '800' }}>{Number(s).toFixed(1)} / 100</span>
                            </div>
                            <div style={{ height: '6px', background: 'var(--text-muted)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(s, 100)}%`, background: best ? `linear-gradient(90deg, ${clr}, var(--c-success))` : clr, borderRadius: '3px', transition: 'width 0.8s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Best combination details */}
                <div style={{ background: 'var(--c-surface)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: '20px', overflow: 'hidden', marginBottom: '32px', boxShadow: 'var(--shadow-md)' }}>
                  <div style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.08), transparent)', padding: '20px 24px', borderBottom: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>🏆</span>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: '900', margin: 0, color: 'var(--c-success)' }}>Best Combination Overall</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', margin: '2px 0 0' }}>
                        {bestLocLabel} × {fmt(bestIndustry)} — Suitability Index: {Number(scores[bestR][bestC]).toFixed(1)}/100
                      </p>
                    </div>
                  </div>
                  {Object.keys(bestResult?.criteria_breakdown || {}).length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }} className="responsive-table">
                        <thead>
                          <tr style={{ background: 'var(--text-muted)' }}>
                            <th style={{ padding: '10px 18px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '750', borderBottom: '1px solid var(--text-muted)' }}>Criterion Parameter</th>
                            <th style={{ padding: '10px 18px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '750', borderBottom: '1px solid var(--text-muted)' }}>Raw Value</th>
                            <th style={{ padding: '10px 18px', textAlign: 'center', color: 'var(--c-success)', fontWeight: '750', borderBottom: '1px solid var(--text-muted)' }}>Score /100</th>
                            <th style={{ padding: '10px 18px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '750', borderBottom: '1px solid var(--text-muted)' }}>Weight</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(bestResult.criteria_breakdown).map(([key, c], idx) => (
                            <tr key={key} style={{ borderBottom: '1px solid var(--text-muted)', background: idx % 2 ? 'var(--text-muted)' : 'transparent' }}>
                              <td style={{ padding: '10px 18px', color: 'var(--text-primary)', fontWeight: '650', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</td>
                              <td style={{ padding: '10px 18px', textAlign: 'center', color: 'var(--text-muted)' }}>{typeof c?.raw === 'number' ? Number(c.raw).toFixed(2) : c?.raw ?? '—'}</td>
                              <td style={{ padding: '10px 18px', textAlign: 'center', color: 'var(--c-success)', fontWeight: '800' }}>{Number(c?.score_100 ?? 0).toFixed(1)}</td>
                              <td style={{ padding: '10px 18px', textAlign: 'center', color: 'var(--text-muted)' }}>{((c?.weight ?? 0) * 100).toFixed(0)}%</td>
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
                <button onClick={() => navigate('/compare')} className="btn-ghost" style={{ padding: '12px 24px' }}>← Hub</button>
                <button onClick={() => { setStep(0); setLocA(null); setLocB(null); setMatrix(null); setError(''); }} className="btn-ghost" style={{ padding: '12px 24px', color: 'var(--cyan)', borderColor: 'rgba(56,189,248,0.22)' }}>Reset Matrix</button>
                <button onClick={handleExportPDF} className="btn-primary" style={{ padding: '12px 28px', boxShadow: 'var(--shadow-md)' }}>📄 Export PDF Grid</button>
              </div>
            </div>
          );
        })()}
      </main>
    </Layout>
  );
}
