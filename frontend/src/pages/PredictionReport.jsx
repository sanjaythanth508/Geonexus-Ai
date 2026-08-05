import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import html2pdf from 'html2pdf.js';

/* ── Icons ── */
const ArrowLeftIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const DownloadIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const ShieldIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const CheckCircleIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>;

function LoadSpinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        style={{ animation: 'spin 0.75s linear infinite', transformOrigin: 'center' }}/>
    </svg>
  );
}

export default function PredictionReport() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  
  const [result] = useState(() => {
    return location.state?.result || JSON.parse(sessionStorage.getItem('last_prediction_report') || 'null');
  });

  useEffect(() => {
    if (location.state?.result) {
      sessionStorage.setItem('last_prediction_report', JSON.stringify(location.state.result));
    }
  }, [location.state]);

  if (!result) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)',
        color: 'var(--text-primary)', padding: '24px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>
          No Analysis Report Loaded
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '400px' }}>
          Please run a geospatial suitability prediction on the Control Desk first.
        </p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">
          <ArrowLeftIcon /> Return to Control Desk
        </button>
      </div>
    );
  }

  const {
    district = "Gujarat Region",
    industry_type = "Industrial Site",
    mcda_final_suitability_score = 0,
    lightgbm_predicted_label = "Moderate",
    highway_corridor_bonus = 0,
    river_reliability_bonus = 0,
    nearest_highway_ref = "NH-8 Corridor",
    nearest_river_name = "Narmada Basin",
    criteria_breakdown = {},
    latitude,
    longitude,
  } = result;

  const scoreNum = Number(mcda_final_suitability_score) || 0;
  
  // Single-word classification
  let categoryLabel = "Moderate";
  let badgeColor = "#22D3EE"; // Cyan
  let badgeBg = "rgba(34, 211, 238, 0.12)";
  let badgeBorder = "rgba(34, 211, 238, 0.3)";

  if (scoreNum >= 75 || lightgbm_predicted_label.toLowerCase().includes('high') || lightgbm_predicted_label.toLowerCase().includes('excellent')) {
    categoryLabel = "Excellent";
    badgeColor = "#10B981"; // Emerald
    badgeBg = "rgba(16, 185, 129, 0.12)";
    badgeBorder = "rgba(16, 185, 129, 0.3)";
  } else if (scoreNum >= 50 || lightgbm_predicted_label.toLowerCase().includes('moderate') || lightgbm_predicted_label.toLowerCase().includes('good')) {
    categoryLabel = "Good";
    badgeColor = "#22D3EE"; // Cyan
    badgeBg = "rgba(34, 211, 238, 0.12)";
    badgeBorder = "rgba(34, 211, 238, 0.3)";
  } else {
    categoryLabel = "Poor";
    badgeColor = "#EF4444"; // Red
    badgeBg = "rgba(239, 68, 68, 0.12)";
    badgeBorder = "rgba(239, 68, 68, 0.3)";
  }

  const sortedCriteria = Object.entries(criteria_breakdown || {})
    .sort((a, b) => (b[1]?.weight || 0) - (a[1]?.weight || 0));

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const handleDownloadPdfFile = () => {
    const element = document.getElementById('simple-clean-pdf-template');
    if (!element) return;

    setDownloading(true);

    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `GeoNexus_Report_${district.replace(/\s+/g, '_')}.pdf`,
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
      display: 'flex', flexDirection: 'column'
    }}>
      {/* ── Action Header ── */}
      <header className="no-print" style={{
        height: 'var(--nav-h)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 40px)', background: 'rgba(10, 14, 26, 0.85)',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link to="/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          color: 'var(--cyan)', textDecoration: 'none', fontWeight: '700', fontSize: '14px',
        }}>
          <ArrowLeftIcon /> Control Desk
        </Link>

        <button
          onClick={handleDownloadPdfFile}
          disabled={downloading}
          className="btn-primary"
          style={{ padding: '8px 22px', fontSize: '13.5px', gap: '8px', opacity: downloading ? 0.7 : 1 }}
        >
          {downloading ? <><LoadSpinner /> Generating PDF...</> : <><DownloadIcon /> Download PDF Report</>}
        </button>
      </header>

      {/* ── HIGHLY DESIGNED WEB VIEW PAGE ── */}
      <main style={{
        flex: 1, maxWidth: '900px', width: '100%', margin: '0 auto',
        padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 24px)',
      }}>

        {/* Premium Web Display Card */}
        <div className="glass-bright" style={{
          borderRadius: 'var(--r-xl)', border: '1px solid var(--border-default)',
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
                  background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ShieldIcon />
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '26px', letterSpacing: '-0.03em' }}>
                  GeoNexus <span className="gradient-text">AI</span>
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Geospatial Intelligence & Site Suitability Audit
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div className="badge badge-cyan" style={{ marginBottom: '6px' }}>Audit ID: #GX-{Math.floor(100000 + Math.random() * 900000)}</div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date: {reportDate}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Operator: {user?.profile?.full_name || user?.username || 'Administrator'}</p>
            </div>
          </div>

          {/* Executive Overview Banner */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--r-lg)', padding: '24px', marginBottom: '32px'
          }} className="report-grid">
            
            <div>
              <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em', color: 'var(--cyan)', textTransform: 'uppercase' }}>
                Audited Location
              </span>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '900', margin: '4px 0 10px', color: 'var(--text-primary)' }}>
                {district}
              </h1>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                <div><strong>Industry Sector:</strong> <span style={{ color: 'var(--cyan)', fontWeight: '700' }}>{industry_type}</span></div>
                {latitude != null && longitude != null && (
                  <div><strong>Map Coordinates:</strong> <code>{latitude.toFixed(5)}° N, {longitude.toFixed(5)}° E</code></div>
                )}
              </div>
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: badgeBg, border: `1px solid ${badgeBorder}`, borderRadius: 'var(--r-md)', padding: '20px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Suitability Score
              </span>
              <div style={{ fontSize: '44px', fontWeight: '900', color: badgeColor, fontFamily: 'var(--font-display)', lineHeight: 1, margin: '6px 0' }}>
                {scoreNum.toFixed(1)} <span style={{ fontSize: '18px', fontWeight: '600', opacity: 0.8 }}>/100</span>
              </div>
              <div style={{
                padding: '5px 18px', borderRadius: 'var(--r-full)',
                background: badgeColor, color: '#000', fontWeight: '800', fontSize: '13px'
              }}>
                {categoryLabel}
              </div>
            </div>

          </div>

          {/* Infrastructure Corridors */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '800', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircleIcon /> Spatial Logistics & Water Infrastructure
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="report-grid">
              <div style={{ padding: '16px', borderRadius: 'var(--r-md)', background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.15)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Highway Logistics Link</span>
                <p style={{ fontSize: '15px', fontWeight: '700', margin: '4px 0', color: 'var(--text-primary)' }}>{nearest_highway_ref || "NH Corridor"}</p>
                <p style={{ fontSize: '12.5px', color: 'var(--emerald)', fontWeight: '700' }}>Corridor Logistics Bonus: +{(highway_corridor_bonus * 100).toFixed(0)}%</p>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--r-md)', background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.15)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Water Network Access</span>
                <p style={{ fontSize: '15px', fontWeight: '700', margin: '4px 0', color: 'var(--text-primary)' }}>{nearest_river_name || "Regional River Basin"}</p>
                <p style={{ fontSize: '12.5px', color: 'var(--purple)', fontWeight: '700' }}>Water Reliability Index: {(river_reliability_bonus * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>

          {/* Full Multi-Criteria Table */}
          {sortedCriteria.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '800', marginBottom: '14px' }}>
                ⚖️ Multi-Criteria Evaluation Matrix (MCDA Breakdown)
              </h3>

              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
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
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: 'var(--cyan)' }}>
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
            <span>Official Confidential Audit Report</span>
          </div>

        </div>
      </main>

      {/* ── HIDDEN CLEAN WHITE TEMPLATE FOR PDF DOWNLOAD ONLY ── */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div id="simple-clean-pdf-template" style={{
          width: '750px',
          background: '#FFFFFF',
          color: '#1E293B',
          padding: '30px 36px',
          fontFamily: 'Arial, sans-serif'
        }}>

          {/* Simple PDF Header */}
          <div style={{ borderBottom: '2px solid #E2E8F0', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#0F172A', fontWeight: 'bold' }}>GeoNexus AI Report</h2>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748B' }}>Land Suitability Evaluation Audit</p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748B' }}>
              <div><strong>Date:</strong> {reportDate}</div>
              <div><strong>Operator:</strong> {user?.profile?.full_name || user?.username || 'Administrator'}</div>
            </div>
          </div>

          {/* Target Location Box */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Target Location</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A', margin: '2px 0' }}>{district}</div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                Sector: {industry_type} {latitude != null && `(${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E)`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Suitability Score</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0F172A' }}>{scoreNum.toFixed(1)} / 100</div>
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
            <span>Confidential Audit Summary</span>
          </div>

        </div>
      </div>

    </div>
  );
}
