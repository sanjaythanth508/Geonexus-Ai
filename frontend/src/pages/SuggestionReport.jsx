import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { useAuth } from '../contexts/AuthContext';
import LocationCompareModal from '../components/Analysis/LocationCompareModal';
import Layout from '../components/Common/Layout';

/* ── Icons ── */
const ArrowLeftIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const DownloadIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const ShieldIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const CheckCircleIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

function LoadSpinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        style={{ animation: 'spin 0.75s linear infinite', transformOrigin: 'center' }}/>
    </svg>
  );
}

export default function SuggestionReport() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedReport] = useState(() => { try { return JSON.parse(sessionStorage.getItem('last_prediction_report') || 'null'); } catch { return null; } });
  const [suggestion] = useState(() => { try { return JSON.parse(sessionStorage.getItem('better_site_suggestion') || 'null'); } catch { return null; } });
  
  const [downloading, setDownloading] = useState(false);
  const [reportDate] = useState(() => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
  const [showCompareModal, setShowCompareModal] = useState(false);

  if (!suggestion) {
    return (
      <Layout>
        <div style={{
          minHeight: '60vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px',
          color: 'var(--text-primary)', textAlign: 'center', padding: '24px'
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: '850', fontSize: '20px' }}>No Optimized Site Found</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '380px' }}>
            Please select a coordinate location and complete the suitability scoring audit first.
          </p>
          <button onClick={() => navigate('/analysis')} className="btn-primary" style={{ padding: '12px 24px' }}>
            Back to Map view
          </button>
        </div>
      </Layout>
    );
  }

  const {
    latitude,
    longitude,
    industry_type,
    district,
    mcda_final_suitability_score,
    nearest_highway_ref,
    highway_corridor_bonus,
    nearest_river_name,
    river_reliability_bonus,
    criteria_breakdown
  } = suggestion;

  const scoreNum = Number(mcda_final_suitability_score || 0);
  let badgeColor = 'var(--c-warning)', badgeBg = 'var(--c-warning-light)', badgeBorder = 'var(--border-subtle)', categoryLabel = 'Moderate';
  if (scoreNum >= 80) { badgeColor = 'var(--c-success)'; badgeBg = 'var(--c-success-light)'; categoryLabel = 'Excellent'; }
  else if (scoreNum >= 60) { badgeColor = 'var(--c-info)'; badgeBg = 'var(--c-info-light)'; categoryLabel = 'Good'; }
  else if (scoreNum >= 40) { badgeColor = 'var(--c-warning)'; badgeBg = 'var(--c-warning-light)'; categoryLabel = 'Moderate'; }
  else { badgeColor = 'var(--c-error)'; badgeBg = 'var(--c-error-light)'; categoryLabel = 'Poor'; }

  const handlePdfExport = () => {
    const element = document.getElementById('simple-clean-suggestion-pdf-template');
    if (!element) return;
    setDownloading(true);

    const filename = `GeoNexus_Optimized_Siting_Report_${industry_type.replace(/\s+/g, '_')}_${district.replace(/\s+/g, '_')}.pdf`;
    const opt = {
      margin: 15,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2.5, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save()
      .then(() => setDownloading(false))
      .catch(() => setDownloading(false));
  };

  const sortedCriteria = criteria_breakdown ? Object.entries(criteria_breakdown).sort((a, b) => (b[1].score_100 || 0) - (a[1].score_100 || 0)) : [];

  return (
    <Layout hideNav={true}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Sub-header Navigation */}
        <header className="no-print" style={{
          height: 'var(--nav-h)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 clamp(16px, 4vw, 40px)', background: 'var(--c-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/analysis/result')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: '12px',
                background: 'var(--c-surface)', border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)', fontWeight: '700', fontSize: '13px',
                cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--c-primary-400)'; e.currentTarget.style.color = 'var(--c-primary-600)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <ArrowLeftIcon /> Back
            </button>
            <button
              onClick={() => navigate('/home')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '12px',
                background: 'var(--c-surface-alt)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)', fontWeight: '700', fontSize: '13px',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
               Home
            </button>
          </div>

          <button
            onClick={handlePdfExport}
            disabled={downloading}
            className="btn-primary"
            style={{ padding: '8px 20px', fontSize: '13px', gap: '6px', opacity: downloading ? 0.7 : 1 }}
          >
            {downloading ? <><LoadSpinner /> Exporting...</> : <><DownloadIcon /> Download Report</>}
          </button>
        </header>

        {/* Audit Web View */}
        <main style={{
          flex: 1, maxWidth: '900px', width: '100%', margin: '0 auto',
          padding: 'clamp(24px, 4vw, 40px) clamp(16px, 4vw, 24px)',
        }}>
          
          <div className="card" style={{
            borderRadius: 'var(--r-xl)', padding: 'clamp(24px, 5vw, 40px)'
          }}>
            
            {/* Header info */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              borderBottom: '1px solid var(--border-subtle)', paddingBottom: '24px', marginBottom: '28px',
              flexWrap: 'wrap', gap: '16px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'var(--c-primary-100)', color: 'var(--c-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <ShieldIcon />
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '24px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    GeoNexus <span style={{ color: 'var(--c-primary-600)' }}>AI</span>
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                  Optimized Siting Recommendation Audit (Nearby Radius)
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="badge" style={{ background: 'var(--c-success-light)', color: 'var(--c-success)', marginBottom: '6px' }}>Suggestion ID: #SUG-{Math.floor(100000 + Math.random() * 900000)}</div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Date: {reportDate}</p>
              </div>
            </div>

            {/* Overview section */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px',
              background: 'var(--c-surface-alt)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--r-lg)', padding: '20px', marginBottom: '32px'
            }}>
              <div>
                <span style={{ fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.08em', color: 'var(--c-success)', textTransform: 'uppercase' }}>
                  Optimized Siting Location
                </span>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: '900', margin: '4px 0 10px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {district}
                </h1>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <div><strong>Target Sector:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{industry_type}</span></div>
                  {latitude != null && longitude != null && (
                    <div><strong>Map Coordinates:</strong> <code style={{fontFamily: 'var(--font-mono)'}}>{latitude.toFixed(5)}° N, {longitude.toFixed(5)}° E</code></div>
                  )}
                </div>
              </div>

              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: badgeBg, border: `1px solid ${badgeBorder}`, borderRadius: 'var(--r-md)', padding: '16px'
              }}>
                <span style={{ fontSize: '10.5px', fontWeight: '800', color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Optimized Score
                </span>
                <div style={{ fontSize: '40px', fontWeight: '950', color: badgeColor, fontFamily: 'var(--font-display)', lineHeight: 1, margin: '6px 0 4px', letterSpacing: '-0.02em' }}>
                  {scoreNum.toFixed(1)} <span style={{ fontSize: '16px', fontWeight: '600', opacity: 0.8 }}>/100</span>
                </div>
                <div style={{
                  padding: '4px 14px', borderRadius: 'var(--r-full)',
                  background: badgeColor, color: 'var(--c-surface)', fontWeight: '850', fontSize: '12px'
                }}>
                  {categoryLabel}
                </div>
              </div>
            </div>

            {/* Infrastructure Linkages */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '850', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                <CheckCircleIcon /> Spatial Logistics & Water Infrastructure
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '16px', borderRadius: 'var(--r-md)', background: 'var(--c-primary-50)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Highway Logistics Link</span>
                  <p style={{ fontSize: '14.5px', fontWeight: '750', margin: '4px 0', color: 'var(--text-primary)' }}>{nearest_highway_ref || "NH Corridor"}</p>
                  <p style={{ fontSize: '12px', color: 'var(--c-primary-700)', fontWeight: '700', margin: 0 }}>Corridor Logistics Bonus: +{(highway_corridor_bonus * 100).toFixed(0)}%</p>
                </div>
                <div style={{ padding: '16px', borderRadius: 'var(--r-md)', background: 'var(--c-accent-50)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Water Network Access</span>
                  <p style={{ fontSize: '14.5px', fontWeight: '750', margin: '4px 0', color: 'var(--text-primary)' }}>{nearest_river_name || "Regional River Basin"}</p>
                  <p style={{ fontSize: '12px', color: 'var(--c-accent-700)', fontWeight: '700', margin: 0 }}>Water Reliability Index: {(river_reliability_bonus * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>

            {/* Criteria Breakdown */}
            {sortedCriteria.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '850', marginBottom: '14px', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                  ️ Multi-Criteria Evaluation Matrix (MCDA Breakdown)
                </h3>
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }} className="responsive-table">
                    <thead>
                      <tr style={{ background: 'var(--c-surface-alt)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', fontWeight: '750', color: 'var(--text-secondary)' }}>Evaluation Metric</th>
                        <th style={{ padding: '10px 14px', fontWeight: '750', color: 'var(--text-secondary)', textAlign: 'right' }}>Calculated Score</th>
                        <th style={{ padding: '10px 14px', fontWeight: '750', color: 'var(--text-secondary)', textAlign: 'right' }}>Impact Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCriteria.map(([crit, v], idx) => (
                        <tr key={crit} style={{ borderBottom: idx < sortedCriteria.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                          <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                            {crit.replace(/_/g, ' ')}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '750', color: 'var(--c-success)' }}>
                            {(v?.score_100 || 0).toFixed(0)} / 100
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)' }}>
                            {((v?.weight || 0) * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{
              marginTop: '32px', paddingTop: '16px', borderTop: '1px dashed var(--border-subtle)',
              display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)'
            }}>
              <span>GeoNexus AI Geospatial Platform</span>
              <span>Confidential Siting Audit Summary</span>
            </div>

            {/* Navigation & Bottom Action bar */}
            <div style={{
              marginTop: '28px', padding: '18px 20px', borderRadius: '16px',
              background: 'var(--c-success-light)', border: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap'
            }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--c-success)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                   Compare & Switch Views
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '2px' }}>
                  View the selected site report or perform a side-by-side comparison.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/report')}
                  className="btn-ghost"
                  style={{ padding: '8px 16px', fontSize: '12.5px', color: 'var(--c-error)', borderColor: 'var(--border-default)', background: 'var(--c-surface)' }}
                >
                  View Selected
                </button>
                {selectedReport && (
                  <button
                    onClick={() => setShowCompareModal(true)}
                    className="btn-ghost"
                    style={{ padding: '8px 16px', fontSize: '12.5px', color: 'var(--c-primary-600)', borderColor: 'var(--border-default)', background: 'var(--c-surface)' }}
                  >
                    Compare Both
                  </button>
                )}
                <button
                  onClick={() => navigate('/analysis/suggestion-map')}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '12.5px', background: 'var(--c-success)', border: 'none', color: 'var(--c-surface)' }}
                >
                  View Map
                </button>
              </div>
            </div>

          </div>
        </main>

        {showCompareModal && selectedReport && suggestion && (
          <LocationCompareModal
            isOpen={showCompareModal}
            onClose={() => setShowCompareModal(false)}
            selectedData={selectedReport}
            suggestionData={suggestion}
            onViewMap={() => navigate('/analysis/suggestion-map')}
          />
        )}

        {/* ── HIDDEN PRINTING TEMPLATE ── */}
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <div id="simple-clean-suggestion-pdf-template" style={{
            width: '700px', background: 'var(--text-primary)', color: 'var(--border-default)', padding: '32px 36px', fontFamily: 'Arial, sans-serif'
          }}>
            <div style={{ borderBottom: '2px solid var(--border-default)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--border-default)', fontWeight: 'bold' }}>GeoNexus AI Report</h2>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--border-default)' }}>Land Suitability Optimization Audit</p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--border-default)' }}>
                <div>Date: {reportDate}</div>
              </div>
            </div>

            <div style={{ background: 'var(--c-success)', border: '1px solid var(--c-success)', borderRadius: '6px', padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--c-success)', fontWeight: 'bold', textTransform: 'uppercase' }}>Optimized Suggested Location</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--border-default)', margin: '2px 0' }}>{district}</div>
                <div style={{ fontSize: '12px', color: 'var(--border-default)' }}>
                  Sector: {industry_type} {latitude != null && `(${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E)`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: 'var(--c-success)', fontWeight: 'bold', textTransform: 'uppercase' }}>Optimized score</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--border-default)' }}>{scoreNum.toFixed(1)} / 100</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--border-default)', textTransform: 'uppercase' }}>Key Infrastructure Corridors</h4>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', background: 'var(--border-default)', border: '1px solid var(--border-default)', width: '50%' }}>
                      <strong>Highway Link:</strong> {nearest_highway_ref || "NH Corridor"} (+{(highway_corridor_bonus * 100).toFixed(0)}%)
                    </td>
                    <td style={{ padding: '8px', background: 'var(--border-default)', border: '1px solid var(--border-default)', width: '50%' }}>
                      <strong>Water Access:</strong> {nearest_river_name || "Regional River Basin"} ({(river_reliability_bonus * 100).toFixed(0)}%)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {sortedCriteria.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--border-default)', textTransform: 'uppercase' }}>Evaluation Metrics Breakdown</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: 'var(--border-default)', borderBottom: '1.5px solid var(--border-default)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 10px' }}>Metric Description</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Calculated Score</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Impact Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCriteria.map(([crit, v], idx) => (
                      <tr key={crit} style={{ borderBottom: '1px solid var(--border-default)', background: idx % 2 === 0 ? 'var(--text-primary)' : 'var(--border-default)' }}>
                        <td style={{ padding: '6px 10px', textTransform: 'capitalize' }}>{crit.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>{(v?.score_100 || 0).toFixed(0)} / 100</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--border-default)' }}>{((v?.weight || 0) * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '8px', fontSize: '10px', color: 'var(--border-default)', display: 'flex', justifyContent: 'space-between' }}>
              <span>GeoNexus AI Geospatial Siting Suite</span>
              <span>Official Siting Audit Summary</span>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
