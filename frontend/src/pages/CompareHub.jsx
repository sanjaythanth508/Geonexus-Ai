import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MODES = [
  {
    id: 'two-points',
    path: '/compare/two-points',
    accent: '#38BDF8',
    glow: 'rgba(56,189,248,0.15)',
    border: 'rgba(56,189,248,0.3)',
    tagBg: 'rgba(56,189,248,0.12)',
    gradient: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(99,102,241,0.08))',
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
        <path d="M5 10c0 7-9 13-9 13" opacity="0" />
        <line x1="8" y1="10" x2="16" y2="10" strokeDasharray="2 2" />
        <path d="M3 21c0-7 3-11 5-13" opacity="0.5" />
      </svg>
    ),
    steps: ['Select Industry', 'Pick Location A', 'Pick Location B', 'View Results'],
  },
  {
    id: 'two-industries',
    path: '/compare/two-industries',
    accent: '#A855F7',
    glow: 'rgba(168,85,247,0.15)',
    border: 'rgba(168,85,247,0.3)',
    tagBg: 'rgba(168,85,247,0.12)',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.08))',
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
    accent: '#10B981',
    glow: 'rgba(16,185,129,0.15)',
    border: 'rgba(16,185,129,0.3)',
    tagBg: 'rgba(16,185,129,0.12)',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(56,189,248,0.08))',
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
        background: hovered ? mode.gradient : 'rgba(15, 23, 42, 0.6)',
        border: `1px solid ${hovered ? mode.border : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '20px',
        padding: '32px 28px',
        cursor: 'pointer',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: hovered ? `0 20px 60px ${mode.glow}, 0 0 0 1px ${mode.border}` : '0 4px 24px rgba(0,0,0,0.4)',
        transform: hovered ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Shimmer */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '20px',
        background: hovered ? `radial-gradient(circle at 30% 20%, ${mode.glow}, transparent 70%)` : 'transparent',
        transition: 'opacity 0.3s', pointerEvents: 'none',
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          padding: '4px 10px', borderRadius: '20px',
          background: mode.tagBg, color: mode.accent,
          fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em',
          border: `1px solid ${mode.border}`,
        }}>
          {mode.tag}
        </div>
        <div style={{
          fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600',
          display: 'flex', gap: '4px', alignItems: 'center',
        }}>
          {mode.steps.length} Steps
        </div>
      </div>

      {/* Icon + Title */}
      <div>
        <div style={{
          width: '60px', height: '60px', borderRadius: '16px',
          background: mode.tagBg, border: `1px solid ${mode.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: mode.accent, marginBottom: '16px',
          boxShadow: hovered ? `0 0 20px ${mode.glow}` : 'none',
          transition: 'box-shadow 0.3s',
        }}>
          {mode.icon}
        </div>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '800',
          color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-0.03em',
        }}>
          {mode.title}
        </h3>
        <p style={{ fontSize: '12px', color: mode.accent, fontWeight: '600', margin: 0, letterSpacing: '0.03em' }}>
          {mode.subtitle}
        </p>
      </div>

      {/* Description */}
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, flex: 1 }}>
        {mode.description}
      </p>

      {/* Step pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {mode.steps.map((s, i) => (
          <span key={i} style={{
            fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-muted)',
          }}>
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{
          fontSize: '14px', fontWeight: '700',
          color: hovered ? mode.accent : 'var(--text-secondary)',
          transition: 'color 0.25s',
        }}>
          {mode.cta}
        </span>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: hovered ? mode.accent : 'rgba(255,255,255,0.06)',
          border: `1px solid ${hovered ? mode.accent : 'rgba(255,255,255,0.1)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: hovered ? '#000' : 'var(--text-muted)',
          transition: 'all 0.25s',
          transform: hovered ? 'translateX(4px)' : 'translateX(0)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', overflow: 'auto',
    }}>
      {/* Background mesh */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 70% 50% at 20% 20%, rgba(245,158,11,0.08) 0%, transparent 60%),
          radial-gradient(ellipse 60% 60% at 80% 80%, rgba(239,68,68,0.07) 0%, transparent 55%),
          radial-gradient(ellipse 50% 40% at 50% 50%, rgba(56,189,248,0.05) 0%, transparent 50%)
        `,
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.2,
        backgroundImage: 'radial-gradient(rgba(56,189,248,0.4) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Navbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: '64px', display: 'flex', alignItems: 'center',
        padding: '0 clamp(16px, 4vw, 40px)',
        background: 'rgba(3, 7, 18, 0.85)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        gap: '16px',
      }}>
        <button
          onClick={() => navigate('/home')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px', padding: '7px 14px', color: 'var(--text-secondary)',
            fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: 'var(--font-sans)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'; e.currentTarget.style.color = '#F59E0B'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.15))',
            border: '1px solid rgba(245,158,11,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px rgba(245,158,11,0.15)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '17px', letterSpacing: '-0.03em' }}>
            <span style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Compare</span>
            <span style={{ color: 'var(--text-primary)' }}> & Analyze</span>
          </span>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto',
        padding: 'clamp(48px, 7vw, 80px) clamp(16px, 4vw, 40px) clamp(24px, 4vw, 40px)',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 14px', borderRadius: '20px',
          background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)',
          marginBottom: '24px', fontSize: '13px', fontWeight: '600', color: '#F59E0B',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B', animation: 'pulse-soft 1.5s infinite' }} />
          Multi-Mode Location Intelligence
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 56px)',
          fontWeight: '900', lineHeight: 1.08, letterSpacing: '-0.04em', margin: '0 0 20px',
        }}>
          <span style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Compare
          </span>{' '}
          <span style={{ color: 'var(--text-primary)' }}>& Analyze</span>
          <br />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.65em', fontWeight: '700' }}>
            Industrial Sites & Industries
          </span>
        </h1>

        <p style={{
          fontSize: 'clamp(14px, 1.8vw, 17px)', color: 'var(--text-muted)',
          lineHeight: 1.7, maxWidth: '560px', margin: '0 auto',
        }}>
          Choose a comparison mode below. Compare two locations for the same industry, one site across two industries, or run a full 2×2 matrix comparison for comprehensive siting intelligence.
        </p>
      </section>

      {/* Mode Cards */}
      <section style={{
        position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto',
        padding: '0 clamp(16px, 4vw, 40px) clamp(60px, 8vw, 100px)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          {MODES.map(m => (
            <ModeCard key={m.id} mode={m} onClick={() => navigate(m.path)} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position: 'relative', zIndex: 1, textAlign: 'center', paddingBottom: '32px',
        fontSize: '12px', color: 'var(--text-faint)',
      }}>
        GeoNexus AI · Compare & Analyze · Powered by MCDA & LightGBM
      </footer>
    </div>
  );
}
