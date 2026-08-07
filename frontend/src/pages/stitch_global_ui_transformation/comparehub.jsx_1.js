import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Common/Layout';

const MODES = [
  {
    id: 'two-points',
    path: '/compare/two-points',
    accent: 'var(--c-primary-500)',
    glow: 'rgba(56,189,248,0.12)',
    border: 'rgba(56,189,248,0.25)',
    tagBg: 'rgba(56,189,248,0.06)',
    gradient: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(99,102,241,0.06))',
    tag: 'Two-Point',
    title: 'Compare Two Locations',
    subtitle: 'Same Industry, Different Sites',
    description:
      'Select one industry type, pick two locations on the map, and get a side-by-side suitability comparison. Identify the superior site with detailed criteria breakdowns, delta scoring, and an exportable PDF report.',
    cta: 'Compare Locations',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
        <line x1="8" y1="10" x2="16" y2="10" strokeDasharray="2 2" />
        <path d="M3 21c0-7 3-11 5-13" opacity="0.5" />
      </svg>
    ),
    steps: ['Select Industry', 'Pick Location A', 'Pick Location B', 'View Results'],
  },
  {
    id: 'two-industries',
    path: '/compare/two-industries',
    accent: 'var(--c-primary-500)',
    glow: 'rgba(168,85,247,0.12)',
    border: 'rgba(168,85,247,0.25)',
    tagBg: 'rgba(168,85,247,0.06)',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.06))',
    tag: 'Industry Matrix',
    title: 'Compare Industries',
    subtitle: 'Same Site, Different Industries',
    description:
      'Choose one location and evaluate how suitable it is for two different industry types. Understand the raw criteria values, per-industry scoring, and determine which industry best fits the selected site.',
    cta: 'Compare Industries',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="9" height="13" />
        <path d="M16 7l3-3 3 3" />
        <path d="M19 4v16" />
        <path d="M6 7V4" />
        <path d="M3 10h8" opacity="0.5" />
      </svg>
    ),
    steps: ['Pick Location', 'Select Industry A', 'Select Industry B', 'View Results'],
  },
  {
    id: 'general',
    path: '/compare/general',
    accent: 'var(--c-success)',
    glow: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)',
    tagBg: 'rgba(16,185,129,0.06)',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(56,189,248,0.06))',
    tag: 'Full Matrix',
    title: 'General Compare',
    subtitle: 'Two Sites × Two Industries',
    description:
      'Full 2×2 matrix comparison — evaluate two locations against two industry types and see all four suitability scores in a comparison grid. Identify row winners, column winners, and the best overall combination.',
    cta: 'Start Matrix',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="8" />
        <rect x="13" y="3" width="8" height="8" />
        <rect x="3" y="13" width="8" height="8" />
        <rect x="13" y="13" width="8" height="8" />
      </svg>
    ),
    steps: ['Pick Industries', 'Pick Location A', 'Pick Location B', 'View Matrix'],
  },
];

function ModeCard({ mode, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: hovered ? mode.gradient : 'rgba(11, 15, 25, 0.45)',
        border: `1px solid ${hovered ? mode.border : 'var(--text-muted)'}`,
        borderRadius: '20px',
        padding: '30px 24px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: hovered ? `0 20px 40px ${mode.glow}` : '0 4px 16px var(--border-default)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '20px',
        background: hovered ? `radial-gradient(circle at 30% 20%, ${mode.glow}, transparent 70%)` : 'transparent',
        transition: 'opacity 0.3s', pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          padding: '4px 10px', borderRadius: '20px',
          background: mode.tagBg, color: mode.accent,
          fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em',
          border: `1px solid ${mode.border}`,
        }}>
          {mode.tag}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
          {mode.steps.length} Steps
        </div>
      </div>

      <div>
        <div style={{
          width: '56px', height: '56px', borderRadius: '14px',
          background: mode.tagBg, border: `1px solid ${mode.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: mode.accent, marginBottom: '14px',
          boxShadow: hovered ? `0 0 16px ${mode.glow}` : 'none',
          transition: 'box-shadow 0.3s',
        }}>
          {mode.icon}
        </div>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '850',
          color: 'var(--text-primary)', margin: '0 0 2px', letterSpacing: '-0.02em',
        }}>
          {mode.title}
        </h3>
        <p style={{ fontSize: '12px', color: mode.accent, fontWeight: '700', margin: 0, letterSpacing: '0.03em' }}>
          {mode.subtitle}
        </p>
      </div>

      <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, flex: 1 }}>
        {mode.description}
      </p>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {mode.steps.map((s, i) => (
          <span key={i} style={{
            fontSize: '10.5px', padding: '3px 8px', borderRadius: '6px',
            background: 'var(--text-muted)', border: '1px solid var(--text-muted)',
            color: 'var(--text-muted)', fontWeight: '600'
          }}>
            {i + 1}. {s}
          </span>
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '14px', borderTop: '1px solid var(--text-muted)',
      }}>
        <span style={{
          fontSize: '13px', fontWeight: '750',
          color: hovered ? mode.accent : 'var(--text-secondary)',
          transition: 'color 0.25s',
        }}>
          {mode.cta}
        </span>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: hovered ? mode.accent : 'var(--text-muted)',
          border: `1px solid ${hovered ? mode.accent : 'var(--text-muted)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: hovered ? '#000' : 'var(--text-muted)',
          transition: 'all 0.25s',
          transform: hovered ? 'translateX(4px)' : 'translateX(0)',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function CompareHub() {
  const navigate = useNavigate();

  return (
    <Layout>
      {/* Subheader */}
      <div style={{
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '12px clamp(16px, 4vw, 40px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>
            Comparison <span className="gradient-text">Hub</span>
          </h1>
        </div>
      </div>

      <main style={{
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        padding: 'clamp(28px, 4vw, 56px) clamp(16px, 4vw, 40px)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px',
            borderRadius: '20px', background: 'var(--c-surface)', border: '1px solid rgba(245,158,11,0.18)',
            marginBottom: '16px', fontSize: '11.5px', fontWeight: '850', color: '#F59E0B', letterSpacing: '0.04em', textTransform: 'uppercase'
          }}>
            Multi-Criteria Decision Analysis
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,4vw,36px)', fontWeight: '900', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Select Siting Comparison Mode
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14.5px', maxWidth: '520px', margin: '0 auto' }}>
            Evaluate and compare multiple regional site locations and industry sectors using dual maps and side-by-side matrices.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {MODES.map(mode => (
            <ModeCard
              key={mode.id}
              mode={mode}
              onClick={() => navigate(mode.path)}
            />
          ))}
        </div>
      </main>
    </Layout>
  );
}
