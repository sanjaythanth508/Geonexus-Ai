import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import html2pdf from 'html2pdf.js';
import MapComponent from '../components/Map/MapComponent';

/* ── Icons ── */
const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const DownloadIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const ChatIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const MapIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
const SpinIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" style={{ animation: 'spin 0.75s linear infinite', transformOrigin: 'center' }}/></svg>;

export default function NodeDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(location.state?.project || null);
  const [loading, setLoading] = useState(!location.state?.project);
  const [downloading, setDownloading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (!project) {
      api.get('projects/').then(r => {
        const found = r.data?.find(p => String(p.id) === String(id));
        setProject(found || null);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id, project]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
      <SpinIcon /> Loading node details...
    </div>
  );

  if (!project) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ fontSize: '48px' }}>⚠️</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: '800' }}>Node Not Found</h2>
      <button onClick={() => navigate('/nodes')} style={{ padding: '10px 24px', background: 'var(--grad-btn)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Back to Nodes</button>
    </div>
  );

  // Parse analysis data
  let analysisData = project.analysis_data;
  if (!analysisData && project.description) {
    try {
      const parsed = JSON.parse(project.description);
      analysisData = parsed.analysis || (parsed.mcda_final_suitability_score ? parsed : null);
    } catch { }
  }

  const {
    district = 'Gujarat Region',
    industry_type = 'Industrial Site',
    mcda_final_suitability_score = 0,
    lightgbm_predicted_label = 'Moderate',
    highway_corridor_bonus = 0,
    river_reliability_bonus = 0,
    nearest_highway_ref = 'NH Corridor',
    nearest_river_name = 'Regional River',
    criteria_breakdown = {},
    latitude = project.latitude,
    longitude = project.longitude,
  } = analysisData || {};

  const scoreNum = Number(mcda_final_suitability_score) || 0;
  let categoryLabel = 'Moderate', badgeColor = '#22D3EE', badgeBg = 'rgba(34,211,238,0.12)', badgeBorder = 'rgba(34,211,238,0.3)';
  if (scoreNum >= 75 || lightgbm_predicted_label?.toLowerCase().includes('high') || lightgbm_predicted_label?.toLowerCase().includes('excellent')) {
    categoryLabel = 'Excellent'; badgeColor = '#10B981'; badgeBg = 'rgba(16,185,129,0.12)'; badgeBorder = 'rgba(16,185,129,0.3)';
  } else if (scoreNum < 45 || lightgbm_predicted_label?.toLowerCase().includes('low') || lightgbm_predicted_label?.toLowerCase().includes('poor')) {
    categoryLabel = 'Poor'; badgeColor = '#F43F5E'; badgeBg = 'rgba(244,63,94,0.12)'; badgeBorder = 'rgba(244,63,94,0.3)';
  }

  const sortedCriteria = Object.entries(criteria_breakdown || {}).sort((a, b) => (b[1]?.weight || 0) - (a[1]?.weight || 0));
  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleAskAboutIt = () => {
    const ctx = {
      type: 'node_context',
      nodeName: project.name,
      district,
      industry: industry_type,
      score: scoreNum,
      label: categoryLabel,
      lat: latitude,
      lon: longitude,
      highways: nearest_highway_ref,
      rivers: nearest_river_name,
      criteria: sortedCriteria.slice(0, 5).map(([k, v]) => ({ name: k.replace(/_/g, ' '), score: v?.score_100, weight: ((v?.weight || 0) * 100).toFixed(0) })),
    };
    sessionStorage.setItem('geochat_node_context', JSON.stringify(ctx));
    navigate('/chat');
  };

  const handleDownloadPdf = () => {
    const el = document.getElementById('node-pdf-template');
    if (!el) return;
    setDownloading(true);
    html2pdf().set({
      margin: [10, 10, 10, 10],
      filename: `GeoNexus_${(project.name || 'Node').replace(/\s+/g, '_')}_Report.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(el).save().then(() => setDownloading(false)).catch(() => setDownloading(false));
  };

  const mapMarkers = latitude != null ? [{ lat: Number(latitude), lon: Number(longitude), label: project.name }] : [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      {/* Glow */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${badgeBg}, transparent 60%)` }} />

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px,4vw,40px)',
        background: 'rgba(3,7,18,0.90)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/nodes')}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px',
              fontWeight: '600', transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)'; e.currentTarget.style.color = '#A855F7'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <BackIcon /> Nodes
          </button>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
              {project.name}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{industry_type} · {district}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowMap(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
              background: showMap ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${showMap ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '10px', color: showMap ? 'var(--cyan)' : 'var(--text-secondary)',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
            }}
          >
            <MapIcon /> {showMap ? 'Hide Map' : 'View in Map'}
          </button>
          <button
            onClick={handleAskAboutIt}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
              background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
              borderRadius: '10px', color: '#A855F7', fontWeight: '700', fontSize: '13px',
              cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.1)'; }}
          >
            <ChatIcon /> Ask About It
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px',
              background: 'var(--grad-btn)', border: 'none', borderRadius: '10px',
              color: '#fff', fontWeight: '700', fontSize: '13px', cursor: downloading ? 'not-allowed' : 'pointer',
              opacity: downloading ? 0.7 : 1, transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
              boxShadow: '0 4px 16px rgba(56,189,248,0.2)',
            }}
          >
            {downloading ? <><SpinIcon /> Generating...</> : <><DownloadIcon /> Download PDF</>}
          </button>
        </div>
      </header>

      {/* Map Section (collapsible) */}
      {showMap && latitude != null && (
        <div style={{ height: '400px', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'relative', zIndex: 1 }}>
          <MapComponent
            readOnly={true}
            initialLocation={{ latitude: Number(latitude), longitude: Number(longitude) }}
            markers={mapMarkers}
          />
        </div>
      )}

      {/* Content */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto', padding: 'clamp(24px,4vw,40px) clamp(16px,4vw,40px)' }}>

        {/* Executive Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <p style={{ fontSize: '12px', color: badgeColor, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
              Suitability Classification
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,40px)', fontWeight: '900', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
              {district}
            </h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', color: 'var(--cyan)', fontSize: '12px', fontWeight: '600' }}>
                {industry_type}
              </span>
              {latitude != null && (
                <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '12px' }}>
                  {Number(latitude).toFixed(5)}°N, {Number(longitude).toFixed(5)}°E
                </span>
              )}
            </div>
          </div>

          <div style={{
            background: badgeBg, border: `1px solid ${badgeBorder}`, borderRadius: '16px',
            padding: '20px 28px', textAlign: 'center', minWidth: '140px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: badgeColor, textTransform: 'uppercase', margin: '0 0 4px' }}>Score</p>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '40px', fontWeight: '900', color: badgeColor, lineHeight: 1 }}>
              {scoreNum.toFixed(1)}
            </div>
            <p style={{ fontSize: '13px', color: badgeColor, fontWeight: '600', margin: '4px 0 0' }}>/ 100 · {categoryLabel}</p>
          </div>
        </div>

        {/* Infrastructure Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Highway Corridor', value: nearest_highway_ref, sub: `Logistics Bonus: +${(highway_corridor_bonus * 100).toFixed(0)}%`, color: '#38BDF8', bg: 'rgba(56,189,248,0.06)', border: 'rgba(56,189,248,0.15)' },
            { label: 'Water Access', value: nearest_river_name, sub: `Reliability: ${(river_reliability_bonus * 100).toFixed(0)}%`, color: '#A855F7', bg: 'rgba(168,85,247,0.06)', border: 'rgba(168,85,247,0.15)' },
          ].map(item => (
            <div key={item.label} style={{ padding: '18px', borderRadius: '14px', background: item.bg, border: `1px solid ${item.border}` }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 6px' }}>{item.label}</p>
              <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>{item.value}</p>
              <p style={{ fontSize: '12px', color: item.color, fontWeight: '700', margin: 0 }}>{item.sub}</p>
            </div>
          ))}
        </div>

        {/* MCDA Breakdown Table */}
        {sortedCriteria.length > 0 && (
          <div style={{ background: 'rgba(11,15,25,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', marginBottom: '28px' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '800', margin: 0 }}>
                ⚖️ MCDA Evaluation Matrix
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Multi-Criteria Decision Analysis — Full Criteria Breakdown</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 22px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metric</th>
                  <th style={{ padding: '12px 22px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', textAlign: 'right' }}>Score</th>
                  <th style={{ padding: '12px 22px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', textAlign: 'right' }}>Weight</th>
                </tr>
              </thead>
              <tbody>
                {sortedCriteria.map(([crit, v], idx) => {
                  const s = v?.score_100 || 0;
                  const color = s >= 70 ? '#10B981' : s >= 40 ? '#F59E0B' : '#F43F5E';
                  return (
                    <tr key={crit} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '13px 22px', fontWeight: '600', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {crit.replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '13px 22px', textAlign: 'right' }}>
                        <span style={{ fontWeight: '800', color, fontSize: '14px', fontFamily: 'var(--font-display)' }}>
                          {s.toFixed(0)}<span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>/100</span>
                        </span>
                      </td>
                      <td style={{ padding: '13px 22px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '600' }}>
                        {((v?.weight || 0) * 100).toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ML Prediction */}
        <div style={{ padding: '20px 24px', borderRadius: '14px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '28px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>LightGBM ML Prediction</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '900', color: badgeColor }}>{categoryLabel}</span>
            {lightgbm_predicted_label && lightgbm_predicted_label !== categoryLabel && (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>({lightgbm_predicted_label})</span>
            )}
          </div>
        </div>
      </main>

      {/* Hidden PDF template */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div id="node-pdf-template" style={{ width: '750px', background: '#fff', color: '#1E293B', padding: '30px 36px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ borderBottom: '2px solid #E2E8F0', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#0F172A', fontWeight: 'bold' }}>GeoNexus AI — Node Analysis Report</h2>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748B' }}>Site Suitability Audit</p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748B' }}>
              <div><strong>Node:</strong> {project.name}</div>
              <div><strong>Date:</strong> {reportDate}</div>
              <div><strong>Operator:</strong> {user?.profile?.full_name || user?.username || 'Operator'}</div>
            </div>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Location</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A' }}>{district}</div>
              <div style={{ fontSize: '12px', color: '#475569' }}>Sector: {industry_type} | Coords: {Number(latitude).toFixed(5)}°N, {Number(longitude).toFixed(5)}°E</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Score</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0F172A' }}>{scoreNum.toFixed(1)} / 100</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: badgeColor }}>{categoryLabel}</div>
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#0F172A', textTransform: 'uppercase' }}>Infrastructure</h4>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', background: '#F1F5F9', border: '1px solid #E2E8F0', width: '50%' }}><strong>Highway:</strong> {nearest_highway_ref} (+{(highway_corridor_bonus * 100).toFixed(0)}%)</td>
                  <td style={{ padding: '8px', background: '#F1F5F9', border: '1px solid #E2E8F0', width: '50%' }}><strong>Water:</strong> {nearest_river_name} ({(river_reliability_bonus * 100).toFixed(0)}%)</td>
                </tr>
              </tbody>
            </table>
          </div>
          {sortedCriteria.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#0F172A', textTransform: 'uppercase' }}>MCDA Breakdown</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead><tr style={{ background: '#F1F5F9', textAlign: 'left' }}><th style={{ padding: '6px 10px' }}>Metric</th><th style={{ padding: '6px 10px', textAlign: 'right' }}>Score</th><th style={{ padding: '6px 10px', textAlign: 'right' }}>Weight</th></tr></thead>
                <tbody>{sortedCriteria.map(([crit, v], i) => (
                  <tr key={crit} style={{ background: i % 2 ? '#F8FAFC' : '#fff', borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '6px 10px', textTransform: 'capitalize' }}>{crit.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>{(v?.score_100 || 0).toFixed(0)} / 100</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#64748B' }}>{((v?.weight || 0) * 100).toFixed(0)}%</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '20px', paddingTop: '8px', fontSize: '10px', color: '#94A3B8', display: 'flex', justifyContent: 'space-between' }}>
            <span>GeoNexus AI Geospatial Platform</span><span>Confidential Audit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
