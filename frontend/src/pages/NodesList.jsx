import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

/* ── Icons ── */
const BackIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const MapPinIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const ChevronIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>;
const EmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(100,116,139,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

function ScoreBadge({ score }) {
  if (score == null) return null;
  const n = Number(score);
  let color, bg, border;
  if (n >= 70) { color = '#10B981'; bg = 'rgba(16,185,129,0.12)'; border = 'rgba(16,185,129,0.3)'; }
  else if (n >= 45) { color = '#F59E0B'; bg = 'rgba(245,158,11,0.12)'; border = 'rgba(245,158,11,0.3)'; }
  else { color = '#F43F5E'; bg = 'rgba(244,63,94,0.12)'; border = 'rgba(244,63,94,0.3)'; }
  return (
    <span style={{ padding: '4px 10px', borderRadius: '8px', background: bg, border: `1px solid ${border}`, color, fontSize: '13px', fontWeight: '800', whiteSpace: 'nowrap' }}>
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
  const district = analysisData?.district || '';
  const label = analysisData?.lightgbm_predicted_label || '';

  const ACCENT_COLORS = [
    { accent: '#38BDF8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.25)' },
    { accent: '#A855F7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)' },
    { accent: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
    { accent: '#F97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)' },
    { accent: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  ];
  const c = ACCENT_COLORS[index % ACCENT_COLORS.length];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? `rgba(15,23,42,0.9)` : 'rgba(11,15,25,0.7)',
        border: `1px solid ${hovered ? c.border : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '16px', padding: '24px',
        cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${c.border}` : '0 4px 16px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(16px)',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
            background: c.bg, border: `1px solid ${c.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '18px', color: c.accent,
          }}>
            {(project.name || 'N')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '16px',
              color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
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

      {/* Coordinates */}
      {project.latitude != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
          <span style={{ color: c.accent }}><MapPinIcon /></span>
          {Number(project.latitude).toFixed(5)}°N, {Number(project.longitude).toFixed(5)}°E
        </div>
      )}

      {/* Label + CTA row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {label ? (
          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {label}
          </span>
        ) : <span />}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '12px', fontWeight: '700', color: hovered ? c.accent : 'var(--text-muted)',
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
  const { user } = useAuth();
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
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
    }}>
      {/* Bg glow */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(168,85,247,0.08) 0%, transparent 60%)',
      }} />

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 40px)',
        background: 'rgba(3,7,18,0.88)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 14px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600', transition: 'all 0.2s',
              fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)'; e.currentTarget.style.color = '#A855F7'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <BackIcon /> Home
          </button>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '-0.03em' }}>
              <span style={{ color: '#A855F7' }}>Deployed</span> Nodes
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            padding: '5px 12px', borderRadius: '20px',
            background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)',
            color: '#A855F7', fontSize: '12px', fontWeight: '700',
          }}>
            {projects.length} Nodes
          </div>
          <button
            onClick={() => navigate('/analysis')}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 18px',
              background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(99,102,241,0.15))',
              border: '1px solid rgba(56,189,248,0.3)', borderRadius: '10px',
              color: 'var(--cyan)', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(99,102,241,0.25))'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(99,102,241,0.15))'; }}
          >
            + New Analysis
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: 'clamp(24px,4vw,40px) clamp(16px,4vw,40px)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '12px', color: 'var(--text-muted)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                style={{ animation: 'spin 0.75s linear infinite', transformOrigin: 'center' }}/>
            </svg>
            Loading deployed nodes...
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <EmptyIcon />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', margin: '24px 0 8px' }}>
              No Nodes Deployed Yet
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '28px' }}>
              Run your first geospatial analysis and deploy it to see it here.
            </p>
            <button
              onClick={() => navigate('/analysis')}
              style={{
                padding: '12px 28px', borderRadius: '12px', border: 'none',
                background: 'var(--grad-btn)', color: '#fff', fontWeight: '700',
                fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                boxShadow: '0 8px 24px rgba(56,189,248,0.2)',
              }}
            >
              Run First Analysis →
            </button>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
              Click any node to view its full analysis report, download PDF, or open it in the chatbot.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
            }}>
              {projects.map((p, i) => (
                <NodeCard
                  key={p.id}
                  project={p}
                  index={i}
                  onClick={() => navigate(`/nodes/${p.id}`, { state: { project: p } })}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
