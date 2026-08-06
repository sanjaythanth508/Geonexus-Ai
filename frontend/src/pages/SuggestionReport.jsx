import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import html2pdf from 'html2pdf.js';
import LocationCompareModal from '../components/Analysis/LocationCompareModal';

/* ── Icons ── */
const ArrowLeftIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const DownloadIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const ShieldIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const MapIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;

function LoadSpinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        style={{ animation: 'spin 0.75s linear infinite', transformOrigin: 'center' }}/>
    </svg>
  );
}

export default function SuggestionReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const [suggestion, setSuggestion] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    try {
      const sug = sessionStorage.getItem('better_site_suggestion');
      if (sug) setSuggestion(JSON.parse(sug));

      const rep = sessionStorage.getItem('last_prediction_report');
      if (rep) setSelectedReport(JSON.parse(rep));
    } catch (e) {
      console.error("Error parsing suggestion session storage:", e);
    }
  }, []);

  if (!suggestion) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)',
        color: 'var(--text-primary)', padding: '24px', textAlign: 'center', fontFamily: 'var(--font-sans)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💡</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>
          No Suggestion Loaded
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '400px' }}>
          Please run a geospatial suitability prediction to view location suggestions.
        </p>
        <button onClick={() => navigate('/analysis')} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: '600' }}>
          <ArrowLeftIcon /> Return to Map
        </button>
      </div>
    );
  }

  const {
    district = "Gujarat Region",
    industry_type = "Industrial Site",
    mcda_final_suitability_score = 0,
    lightgbm_predicted_label = "Good",
    highway_corridor_bonus = 0,
    river_reliability_bonus = 0,
    nearest_highway_ref = "NH Corridor",
    nearest_river_name = "Regional River",
    criteria_breakdown = {},
    latitude,
    longitude,
  } = suggestion;

  const scoreNum = Number(mcda_final_suitability_score) || 0;

  let categoryLabel = "Good";
  let badgeColor = "#10B981"; // Emerald
  let badgeBg = "rgba(16, 185, 129, 0.12)";
  let badgeBorder = "rgba(16, 185, 129, 0.3)";

  if (scoreNum >= 75) {
    categoryLabel = "Excellent";
    badgeColor = "#10B981";
    badgeBg = "rgba(16, 185, 129, 0.12)";
    badgeBorder = "rgba(16, 185, 129, 0.3)";
  } else if (scoreNum < 45) {
    categoryLabel = "Poor";
    badgeColor = "#EF4444";
    badgeBg = "rgba(239, 68, 68, 0.12)";
    badgeBorder = "rgba(239, 68, 68, 0.3)";
  }

  const sortedCriteria = Object.entries(criteria_breakdown || {})
    .sort((a, b) => (b[1]?.weight || 0) - (a[1]?.weight || 0));

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const handleDownloadPdfFile = () => {
    const element = document.getElementById('simple-clean-suggestion-pdf-template');
    if (!element) return;

    setDownloading(true);

    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `GeoNexus_Suggestion_Report_${district.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setDownloading(false);
    }).catch((err) => {
      console.error("PDF download failed:", err);
      setDownloading(false);
    });
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)',
      display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)'
    }}>
      {/* ── Action Header ── */}
      <header className="no-print" style={{
        height: 'var(--nav-h)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 40px)', background: 'rgba(10, 14, 26, 0.85)',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate('/report')}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600', transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; e.currentTarget.style.color = '#10B981'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <ArrowLeftIcon /> Back to Selected Report
          </button>

          <div style={{
            padding: '4px 12px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: '12px', fontWeight: '800'
          }}>
            💡 OPTIMIZED SUGGESTION REPORT
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/analysis/suggestion-map')}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 18px',
              background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '10px', color: '#10B981', fontWeight: '700', fontSize: '13.5px',
              cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
            }}
          >
            <MapIcon /> View in Map
          </button>

          <button
            onClick={handleDownloadPdfFile}
            disabled={downloading}
            className="btn-primary"
            style={{ padding: '8px 22px', fontSize: '13.5px', gap: '8px', opacity: downloading ? 0.7 : 1, background: '#10B981' }}
          >
            {downloading ? <><LoadSpinner /> Generating PDF...</> : <><DownloadIcon /> Download PDF Report</>}
          </button>
        </div>
      </header>

      {/* ── WEB VIEW REPORT DOCUMENT ── */}
      <main style={{
        flex: 1, maxWidth: '900px', width: '100%', margin: '0 auto',
        padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 24px)',
      }}>

        {/* Web Display Card */}
        <div className="glass-bright" style={{
          borderRadius: 'var(--r-xl)', border: '1px solid rgba(16,185,129,0.25)',
          boxShadow: 'var(--shadow-xl)', overflow: 'hidden', padding: 'clamp(24px, 5vw, 48px)',
          background: 'var(--bg-surface)'
        }}>

          {/* Web Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            borderBottom: '2px solid var(--border-subtle)', paddingBottom: '24px', marginBottom: '32px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ShieldIcon />
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '26px', letterSpacing: '-0.03em' }}>
                  GeoNexus <span style={{ color: '#10B981' }}>Optimized Site</span>
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Nearby Recommendation Audit (10-20 km Radius Optimization)
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                display: 'inline-block', padding: '4px 10px', borderRadius: '12px',
                background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                color: '#10B981', fontSize: '11px', fontWeight: '800', marginBottom: '6px'
              }}>
                SUGGESTION ID: #SUG-{Math.floor(100000 + Math.random() * 900000)}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date: {reportDate}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Operator: {user?.profile?.full_name || user?.username || 'Administrator'}</p>
            </div>
          </div>

          {/* Executive Overview Banner */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px',
            background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 'var(--r-lg)', padding: '24px', marginBottom: '32px'
          }} className="report-grid">
            
            <div>
              <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em', color: '#10B981', textTransform: 'uppercase' }}>
                💡 Suggested Optimized Location
              </span>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '900', margin: '4px 0 10px', color: 'var(--text-primary)' }}>
                {district}
              </h1>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                <div><strong>Target Sector:</strong> <span style={{ color: '#10B981', fontWeight: '700' }}>{industry_type}</span></div>
                {latitude != null && longitude != null && (
                  <div><strong>Map Coordinates:</strong> <code>{latitude.toFixed(5)}° N, {longitude.toFixed(5)}° E</code></div>
                )}
              </div>
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: badgeBg, border: `1px solid ${badgeBorder}`, borderRadius: 'var(--r-md)', padding: '20px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em', color: badgeColor, textTransform: 'uppercase' }}>
                Optimized Score
              </span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: '900', color: badgeColor, lineHeight: 1, margin: '6px 0 4px' }}>
                {scoreNum.toFixed(1)}
              </div>
              <span style={{ fontSize: '13px', color: badgeColor, fontWeight: '700' }}>
                {categoryLabel} Suitability
              </span>
            </div>

          </div>

          {/* Infrastructure Corridors */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Nearby Logistics & Water Corridors
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="report-grid">
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--r-md)', padding: '18px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Nearest Highway Link
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#38BDF8', fontFamily: 'var(--font-display)' }}>
                  {nearest_highway_ref || 'NH Corridor'}
                </div>
                <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px', fontWeight: '600' }}>
                  +{(highway_corridor_bonus * 100).toFixed(0)}% Siting Corridor Bonus
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--r-md)', padding: '18px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Water Access Vector
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#A855F7', fontFamily: 'var(--font-display)' }}>
                  {nearest_river_name || 'Regional Water Basin'}
                </div>
                <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px', fontWeight: '600' }}>
                  {(river_reliability_bonus * 100).toFixed(0)}% Reliability Score
                </div>
              </div>
            </div>
          </div>

          {/* Criteria Evaluation Table */}
          {sortedCriteria.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                Criteria Evaluation Metrics
              </h3>
              <div style={{
                borderRadius: 'var(--r-md)', border: '1px solid var(--border-subtle)',
                overflow: 'hidden', background: 'rgba(255,255,255,0.01)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-secondary)' }}>Evaluation Metric</th>
                      <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-secondary)', textAlign: 'right' }}>Calculated Score</th>
                      <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-secondary)', textAlign: 'right' }}>Impact Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCriteria.map(([crit, v], idx) => (
                      <tr key={crit} style={{ borderBottom: idx < sortedCriteria.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                        <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                          {crit.replace(/_/g, ' ')}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#10B981' }}>
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

          {/* Web Footer */}
          <div style={{
            marginTop: '32px', paddingTop: '16px', borderTop: '1px dashed var(--border-subtle)',
            display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)'
          }}>
            <span>GeoNexus AI Geospatial Platform</span>
            <span>Optimized Site Suggestion Report</span>
          </div>

          {/* Navigation & Optimization Bottom Action Bar */}
          <div style={{
            marginTop: '28px', padding: '20px', borderRadius: '16px',
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap'
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                📍 Compare & Switch Views
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '2px' }}>
                View the selected site report or perform a side-by-side comparison.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/report')}
                style={{
                  padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#EF4444', cursor: 'pointer', fontFamily: 'var(--font-sans)'
                }}
              >
                📍 View Selected Location Report
              </button>

              {selectedReport && (
                <button
                  onClick={() => setShowCompareModal(true)}
                  style={{
                    padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                    background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)',
                    color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'var(--font-sans)'
                  }}
                >
                  ⚖️ Compare Both Locations
                </button>
              )}

              <button
                onClick={() => navigate('/analysis/suggestion-map')}
                style={{
                  padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                  background: '#10B981', border: 'none', color: '#fff', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16,185,129,0.25)', fontFamily: 'var(--font-sans)'
                }}
              >
                🗺️ View in Map
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Side-by-Side Comparison Modal */}
      {showCompareModal && selectedReport && suggestion && (
        <LocationCompareModal
          isOpen={showCompareModal}
          onClose={() => setShowCompareModal(false)}
          selectedData={selectedReport}
          suggestionData={suggestion}
          onViewMap={() => navigate('/analysis/suggestion-map')}
        />
      )}

      {/* ── HIDDEN CLEAN WHITE TEMPLATE FOR PDF DOWNLOAD ONLY ── */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div id="simple-clean-suggestion-pdf-template" style={{
          width: '750px',
          background: '#FFFFFF',
          color: '#1E293B',
          padding: '30px 36px',
          fontFamily: 'Arial, sans-serif'
        }}>

          {/* Simple PDF Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0F172A', paddingBottom: '12px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#0F172A', fontWeight: 'bold' }}>GeoNexus AI Optimized Suggestion Report</h2>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748B' }}>Land Suitability Optimization Audit (10-20km Radius)</p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748B' }}>
              <div><strong>Date:</strong> {reportDate}</div>
              <div><strong>Operator:</strong> {user?.profile?.full_name || user?.username || 'Administrator'}</div>
            </div>
          </div>

          {/* Target Location Box */}
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold', textTransform: 'uppercase' }}>Optimized Suggested Location</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A', margin: '2px 0' }}>{district}</div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                Sector: {industry_type} {latitude != null && `(${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E)`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold', textTransform: 'uppercase' }}>Optimized Score</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#166534' }}>{scoreNum.toFixed(1)} / 100</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: badgeColor }}>{categoryLabel}</div>
            </div>
          </div>

          {/* Key Corridors */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#0F172A', textTransform: 'uppercase' }}>Key Infrastructure Corridors</h4>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', background: '#F1F5F9', border: '1px solid #E2E8F0', width: '50%' }}>
                    <strong>Highway Link:</strong> {nearest_highway_ref || "NH Corridor"} (+{(highway_corridor_bonus * 100).toFixed(0)}%)
                  </td>
                  <td style={{ padding: '8px', background: '#F1F5F9', border: '1px solid #E2E8F0', width: '50%' }}>
                    <strong>Water Access:</strong> {nearest_river_name || "Regional River"} ({(river_reliability_bonus * 100).toFixed(0)}%)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Criteria Table */}
          {sortedCriteria.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#0F172A', textTransform: 'uppercase' }}>Evaluation Metrics Breakdown</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '1.5px solid #CBD5E1', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px' }}>Metric</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Score</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCriteria.map(([crit, v], idx) => (
                    <tr key={crit} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '6px 10px', textTransform: 'capitalize' }}>{crit.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>{(v?.score_100 || 0).toFixed(0)} / 100</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: '#64748B' }}>{((v?.weight || 0) * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Simple PDF Footer */}
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '8px', fontSize: '10px', color: '#94A3B8', display: 'flex', justifyContent: 'space-between' }}>
            <span>GeoNexus AI Geospatial Platform</span>
            <span>Confidential Suggestion Summary</span>
          </div>

        </div>
      </div>

    </div>
  );
}
