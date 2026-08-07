import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Layout from '../components/Common/Layout';

/* ── Icons ── */
const MapPinIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const ChevronIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>;
const LoadSpinner = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.75s linear infinite', transformOrigin: 'center' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>;

const INDUSTRY_ICONS = {
  'Warehousing': '🏭', 'Textile': '🧵', 'Pharmaceutical': '💊', 'Chemical': '⚗️',
  'Food Processing': '🌽', 'Ceramic': '🏺', 'Diamond': '💎', 'Cotton': '🌾',
  'Steel': '⚙️', 'Plastics': '🔬', 'Paper': '📄', 'Renewable Energy': '⚡',
  'Engineering': '🔧', 'Electronics': '💻', 'IT': '🖥️', 'Auto': '🚗',
};

function getIndustryIcon(type) {
  const key = Object.keys(INDUSTRY_ICONS).find(k => type?.toLowerCase().includes(k.toLowerCase()));
  return key ? INDUSTRY_ICONS[key] : '🏗️';
}

function ScoreBadge({ score }) {
  if (score == null) return null;
  const n = Number(score);
  let color, bg, border;
  if (n >= 70) { color = 'var(--c-success)'; bg = 'rgba(16,185,129,0.06)'; border = 'rgba(16,185,129,0.22)'; }
  else if (n >= 45) { color = '#F59E0B'; bg = 'rgba(245,158,11,0.06)'; border = 'rgba(245,158,11,0.22)'; }
  else { color = '#F43F5E'; bg = 'rgba(244,63,94,0.06)'; border = 'rgba(244,63,94,0.22)'; }
  return (
    <span style={{ padding: '4px 10px', borderRadius: '8px', background: bg, border: `1px solid ${border}`, color, fontSize: '12.5px', fontWeight: '800', whiteSpace: 'nowrap' }}>
      {n.toFixed(1)}/100
    </span>
  );
}

function NodeCard({ project, index, onClick }) {
  const [hovered, setHovered] = useState(false);

  let analysisData = project.analysis_data;
  if (!analysisData && project.description) {
    try {
      const parsed = JSON.parse(project.description);
      analysisData = parsed.analysis || (parsed.mcda_final_suitability_score ? parsed : null);
    } catch { }
  }

  const score = analysisData?.mcda_final_suitability_score ?? analysisData?.final_suitability_score;
  const industry = analysisData?.industry_type || analysisData?.industry || 'General';
  const district = analysisData?.district || 'Gujarat';
  const label = analysisData?.lightgbm_predicted_label || '';

  const ACCENT_COLORS = [
    { accent: 'var(--c-primary-500)', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.22)' },
    { accent: 'var(--c-primary-500)', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.22)' },
    { accent: 'var(--c-success)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.22)' },
    { accent: 'var(--c-warning)', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.22)' },
    { accent: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)' },
  ];
  const c = ACCENT_COLORS[index % ACCENT_COLORS.length];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(15,23,42,0.85)' : 'rgba(11,15,25,0.45)',
        border: `1px solid ${hovered ? c.border : 'var(--text-muted)'}`,
        borderRadius: '20px', padding: '24px',
        cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? `0 16px 36px var(--border-default)` : '0 4px 16px var(--border-default)',
        backdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
            background: c.bg, border: `1px solid ${c.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px'
          }}>
            {getIndustryIcon(industry)}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '16px',
              color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em'
            }}>
              {project.name}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0', fontWeight: '500' }}>
              {industry}{district ? ` · ${district}` : ''}
            </p>
          </div>
        </div>
        <ScoreBadge score={score} />
      </div>

      {project.latitude != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600' }}>
          <span style={{ color: c.accent }}><MapPinIcon /></span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {Number(project.latitude).toFixed(5)}°N, {Number(project.longitude).toFixed(5)}°E
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--text-muted)' }}>
        {label ? (
          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'var(--text-muted)', color: 'var(--text-muted)', border: '1px solid var(--text-muted)', fontWeight: '600' }}>
            {label}
          </span>
        ) : <span />}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '12.5px', fontWeight: '750', color: hovered ? c.accent : 'var(--text-secondary)',
          transition: 'color 0.2s',
        }}>
          View Details <ChevronIcon />
        </div>
      </div>
    </div>
  );
}

export default function NodesList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('projects/');
      setProjects(res.data || []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  return (
    <Layout>
      {/* Sub header details */}
      <div style={{
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '12px clamp(16px, 4vw, 40px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>
              Deployed <span className="gradient-text">Nodes</span>
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              padding: '6px 12px', borderRadius: '20px',
              background: 'var(--c-surface)', border: '1px solid rgba(168,85,247,0.22)',
              color: 'var(--c-primary-500)', fontSize: '11.5px', fontWeight: '750',
            }}>
              {projects.length} Nodes Active
            </div>
            <button
              onClick={() => navigate('/analysis')}
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: '12.5px' }}
            >
              + Deploy New Node
            </button>
          </div>
        </div>
      </div>

      <main style={{
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        padding: 'clamp(28px, 4vw, 48px) clamp(16px, 4vw, 40px)',
      }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px', color: 'var(--text-muted)' }}>
            <LoadSpinner />
            <p style={{ fontSize: '14.5px', fontWeight: '650' }}>Retrieving operator catalog...</p>
          </div>
        ) : projects.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px',
          }}>
            {projects.map((project, idx) => (
              <NodeCard
                key={project.id}
                project={project}
                index={idx}
                onClick={() => navigate(`/nodes/${project.id}`)}
              />
            ))}
          </div>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '300px', gap: '16px', color: 'var(--text-muted)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px' }}>🛰️</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '850', fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>
              No Deployed Nodes Found
            </h3>
            <p style={{ fontSize: '13.5px', maxWidth: '340px', margin: 0, lineHeight: 1.5 }}>
              You haven't cataloged any suitability analysis results as nodes yet. Run an analysis on coordinate models to catalog them.
            </p>
            <button
              onClick={() => navigate('/analysis')}
              className="btn-primary"
              style={{ padding: '12px 24px', fontSize: '13.5px', marginTop: '6px' }}
            >
              Analyze Siting Location
            </button>
          </div>
        )}
      </main>
    </Layout>
  );
}
