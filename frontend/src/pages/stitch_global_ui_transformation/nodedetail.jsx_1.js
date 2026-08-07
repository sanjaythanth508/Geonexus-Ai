import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import MapComponent from '../components/Map/MapComponent';
import Layout from '../components/Common/Layout';

/* ── Icons ── */
const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const DownloadIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const ChatIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const MapIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
const SpinIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" style={{ animation: 'spin 0.75s linear infinite', transformOrigin: 'center' }}/></svg>;
const DeleteIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

export default function NodeDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(location.state?.project || null);
  const [loading, setLoading] = useState(!location.state?.project);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    <Layout hideNav={true}>
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
        <SpinIcon /> <span>Loading node details...</span>
      </div>
    </Layout>
  );

  if (!project) return (
    <Layout hideNav={true}>
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', textAlign: 'center' }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: '850', fontSize: '22px' }}>Node Not Found</h2>
        <button onClick={() => navigate('/nodes')} className="btn-primary" style={{ padding: '10px 24px' }}>Back to Nodes</button>
      </div>
    </Layout>
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
  let categoryLabel = 'Moderate', badgeColor = '#22D3EE', badgeBg = 'rgba(34,211,238,0.06)', badgeBorder = 'rgba(34,211,238,0.22)';
  if (scoreNum >= 75 || lightgbm_predicted_label?.toLowerCase().includes('high') || lightgbm_predicted_label?.toLowerCase().includes('excellent')) {
    categoryLabel = 'Excellent'; badgeColor = 'var(--c-success)'; badgeBg = 'rgba(16,185,129,0.06)'; badgeBorder = 'rgba(16,185,129,0.22)';
  } else if (scoreNum < 45 || lightgbm_predicted_label?.toLowerCase().includes('low') || lightgbm_predicted_label?.toLowerCase().includes('poor')) {
    categoryLabel = 'Poor'; badgeColor = '#F43F5E'; badgeBg = 'rgba(244,63,94,0.06)'; badgeBorder = 'rgba(244,63,94,0.22)';
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
      html2canvas: { scale: 2, useCORS: true, backgroundColor: 'var(--text-primary)' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(el).save().then(() => setDownloading(false)).catch(() => setDownloading(false));
  };

  const handleDeleteNode = async () => {
    if (!window.confirm(`Are you sure you want to delete the deployed node "${project.name}"?`)) {
      return;
    }
    setDeleting(true);
    try {
      await api.delete(`projects/${project.id}/`);
      navigate('/nodes');
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const mapMarkers = latitude != null ? [{ lat: Number(latitude), lon: Number(longitude), label: project.name }] : [];

  return (
    <Layout hideNav={true}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Subheader */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 100,
          height: 'var(--nav-h)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 clamp(16px,4vw,40px)',
          background: 'var(--c-surface)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/nodes')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                background: 'var(--text-muted)', border: '1px solid var(--text-muted)',
                borderRadius: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px',
                fontWeight: '700', transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)'; e.currentTarget.style.color = 'var(--c-primary-500)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <BackIcon /> Nodes
            </button>
            <div className="hidden sm:block">
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '16.5px', fontWeight: '850', margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {project.name}
              </h1>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{industry_type} · {district}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowMap(v => !v)}
              className="btn-ghost"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '12.5px',
                borderColor: showMap ? 'rgba(56,189,248,0.4)' : 'var(--text-muted)'
              }}
            >
              <MapIcon /> {showMap ? 'Hide Map' : 'Map View'}
            </button>
            <button
              onClick={handleAskAboutIt}
              className="btn-ghost"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '12.5px',
                color: 'var(--c-primary-500)', borderColor: 'rgba(168,85,247,0.3)'
              }}
            >
              <ChatIcon /> Ask AI
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '12.5px', gap: '6px', opacity: downloading ? 0.7 : 1 }}
            >
              {downloading ? <><SpinIcon /> Exporting...</> : <><DownloadIcon /> PDF</>}
            </button>
            <button
              onClick={handleDeleteNode}
              disabled={deleting}
              className="btn-ghost"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '12.5px',
                color: '#F43F5E', borderColor: 'rgba(244,63,94,0.3)'
              }}
            >
              {deleting ? <><SpinIcon /> Deleting...</> : <><DeleteIcon /> Delete</>}
            </button>
          </div>
        </header>

        {/* Map view collapsible block */}
        {showMap && latitude != null && (
          <div style={{ height: '360px', borderBottom: '1px solid var(--border-subtle)', position: 'relative', zIndex: 1 }}>
            <MapComponent
              readOnly={true}
              initialLocation={{ latitude: Number(latitude), longitude: Number(longitude) }}
              markers={mapMarkers}
            />
          </div>
        )}

        <main style={{ maxWidth: '900px', width: '100%', margin: '0 auto', padding: 'clamp(24px,4vw,40px) clamp(16px,4vw,24px)' }}>
          {/* Executive Overview */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px',
            alignItems: 'center', marginBottom: '32px', background: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-lg)', padding: '24px'
          }}>
            <div>
              <p style={{ fontSize: '11px', color: badgeColor, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                Node Suitability Index
              </p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,4vw,34px)', fontWeight: '900', margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {district}
              </h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="badge badge-cyan">{industry_type}</span>
                {latitude != null && (
                  <span className="badge badge-purple" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Number(latitude).toFixed(5)}°N, {Number(longitude).toFixed(5)}°E
                  </span>
                )}
              </div>
            </div>

            <div style={{
              background: badgeBg, border: `1px solid ${badgeBorder}`, borderRadius: '16px',
              padding: '18px 24px', textAlign: 'center', marginLeft: 'auto',
              boxShadow: `0 8px 24px ${badgeBg}`
            }} className="w-full sm:w-auto">
              <p style={{ fontSize: '10.5px', fontWeight: '800', color: badgeColor, textTransform: 'uppercase', margin: '0 0 4px', letterSpacing: '0.04em' }}>Score</p>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '40px', fontWeight: '950', color: badgeColor, lineHeight: 1 }}>
                {scoreNum.toFixed(1)}
              </div>
              <p style={{ fontSize: '12.5px', color: badgeColor, fontWeight: '750', margin: '4px 0 0' }}>/ 100 · {categoryLabel}</p>
            </div>
          </div>

          {/* Infrastructure grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div style={{ padding: '18px', borderRadius: '14px', background: 'var(--c-surface)', border: '1px solid rgba(56,189,248,0.15)' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Highway Logistics Corridor</span>
              <p style={{ fontSize: '15px', fontWeight: '800', margin: '4px 0', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{nearest_highway_ref}</p>
              <p style={{ fontSize: '12px', color: 'var(--cyan)', fontWeight: '700', margin: 0 }}>Logistics Bonus: +{(highway_corridor_bonus * 100).toFixed(0)}%</p>
            </div>
            <div style={{ padding: '18px', borderRadius: '14px', background: 'var(--c-surface)', border: '1px solid rgba(168,85,247,0.15)' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Water Supply Vector</span>
              <p style={{ fontSize: '15px', fontWeight: '800', margin: '4px 0', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{nearest_river_name}</p>
              <p style={{ fontSize: '12px', color: 'var(--purple)', fontWeight: '700', margin: 0 }}>Supply Reliability: {(river_reliability_bonus * 100).toFixed(0)}%</p>
            </div>
          </div>

          {/* Decision Matrix Table */}
          {sortedCriteria.length > 0 && (
            <div style={{ background: 'var(--c-surface)', border: '1px solid var(--text-muted)', borderRadius: '16px', overflow: 'hidden', marginBottom: '32px' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--text-muted)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '850', margin: 0 }}>
                  ⚖️ MCDA Suitability Breakdown
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Score matrix weights calculated via Multi-Criteria Decision Analysis.</p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }} className="responsive-table">
                <thead>
                  <tr style={{ background: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 22px', fontWeight: '750', color: 'var(--text-secondary)', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Metric Description</th>
                    <th style={{ padding: '12px 22px', fontWeight: '750', color: 'var(--text-secondary)', fontSize: '11.5px', textTransform: 'uppercase', textAlign: 'right' }}>Score</th>
                    <th style={{ padding: '12px 22px', fontWeight: '750', color: 'var(--text-secondary)', fontSize: '11.5px', textTransform: 'uppercase', textAlign: 'right' }}>Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCriteria.map(([crit, v]) => {
                    const s = v?.score_100 || 0;
                    const color = s >= 70 ? 'var(--c-success)' : s >= 40 ? '#F59E0B' : '#F43F5E';
                    return (
                      <tr key={crit} style={{ borderTop: '1px solid var(--text-muted)' }}>
                        <td style={{ padding: '12px 22px', fontWeight: '600', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                          {crit.replace(/_/g, ' ')}
                        </td>
                        <td style={{ padding: '12px 22px', textAlign: 'right' }}>
                          <span style={{ fontWeight: '800', color, fontSize: '13.5px', fontFamily: 'var(--font-display)' }}>
                            {s.toFixed(0)}<span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '500' }}>/100</span>
                          </span>
                        </td>
                        <td style={{ padding: '12px 22px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '600' }}>
                          {((v?.weight || 0) * 100).toFixed(0)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Model Inference prediction details */}
          <div style={{ padding: '20px', borderRadius: '14px', background: 'var(--text-muted)', border: '1px solid var(--border-subtle)', marginBottom: '32px' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>LightGBM Machine Learning Prediction</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '900', color: badgeColor }}>{categoryLabel}</span>
              {lightgbm_predicted_label && lightgbm_predicted_label !== categoryLabel && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>({lightgbm_predicted_label})</span>
              )}
            </div>
          </div>
        </main>

        {/* ── HIDDEN PDF GENERATION TEMPLATE ── */}
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <div id="node-pdf-template" style={{ width: '700px', background: 'var(--text-primary)', color: 'var(--border-default)', padding: '32px 36px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ borderBottom: '2px solid var(--border-default)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--border-default)', fontWeight: 'bold' }}>GeoNexus AI — Node Siting Report</h2>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--border-default)' }}>Suitability Analysis Audit Summary</p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--border-default)' }}>
                <div><strong>Node Name:</strong> {project.name}</div>
                <div><strong>Date:</strong> {reportDate}</div>
              </div>
            </div>

            <div style={{ background: 'var(--border-default)', border: '1px solid var(--border-default)', borderRadius: '6px', padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--border-default)', fontWeight: 'bold', textTransform: 'uppercase' }}>Region</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--border-default)' }}>{district}</div>
                <div style={{ fontSize: '12px', color: 'var(--border-default)' }}>Sector: {industry_type} | Coords: {Number(latitude).toFixed(5)}°N, {Number(longitude).toFixed(5)}°E</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: 'var(--border-default)', fontWeight: 'bold', textTransform: 'uppercase' }}>Score</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--border-default)' }}>{scoreNum.toFixed(1)} / 100</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: badgeColor }}>{categoryLabel}</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--border-default)', textTransform: 'uppercase' }}>Infrastructure linkages</h4>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', background: 'var(--border-default)', border: '1px solid var(--border-default)', width: '50%' }}><strong>Highway:</strong> {nearest_highway_ref} (+{(highway_corridor_bonus * 100).toFixed(0)}%)</td>
                    <td style={{ padding: '8px', background: 'var(--border-default)', border: '1px solid var(--border-default)', width: '50%' }}><strong>Water:</strong> {nearest_river_name} ({(river_reliability_bonus * 100).toFixed(0)}%)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {sortedCriteria.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--border-default)', textTransform: 'uppercase' }}>MCDA Breakdown</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead><tr style={{ background: 'var(--border-default)', textAlign: 'left' }}><th style={{ padding: '6px 10px' }}>Metric</th><th style={{ padding: '6px 10px', textAlign: 'right' }}>Score</th><th style={{ padding: '6px 10px', textAlign: 'right' }}>Weight</th></tr></thead>
                  <tbody>{sortedCriteria.map(([crit, v], i) => (
                    <tr key={crit} style={{ background: i % 2 ? 'var(--border-default)' : 'var(--text-primary)', borderBottom: '1px solid var(--border-default)' }}>
                      <td style={{ padding: '6px 10px', textTransform: 'capitalize' }}>{crit.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>{(v?.score_100 || 0).toFixed(0)} / 100</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--border-default)' }}>{((v?.weight || 0) * 100).toFixed(0)}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-default)', marginTop: '20px', paddingTop: '8px', fontSize: '10px', color: 'var(--border-default)', display: 'flex', justifyContent: 'space-between' }}>
              <span>GeoNexus AI Geospatial Siting Suite</span><span>Confidential Audit Summary</span>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
