import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

/* ── Icons ── */
const ChatIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <path d="M8 10h.01M12 10h.01M16 10h.01"/>
  </svg>
);
const NodeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);
const AnalysisIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/>
    <line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
);
const CompareIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);
const GlobeIcon = () => (
  <svg width="60" height="60" viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="20" stroke="url(#globeGrad)" strokeWidth="1.5"/>
    <ellipse cx="24" cy="24" rx="9" ry="20" stroke="url(#globeGrad)" strokeWidth="1.2"/>
    <line x1="4" y1="24" x2="44" y2="24" stroke="url(#globeGrad)" strokeWidth="1.2"/>
    <line x1="24" y1="4" x2="24" y2="44" stroke="url(#globeGrad)" strokeWidth="0.8" strokeDasharray="2 3"/>
    <defs>
      <linearGradient id="globeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38BDF8"/>
        <stop offset="50%" stopColor="#6366F1"/>
        <stop offset="100%" stopColor="#A855F7"/>
      </linearGradient>
    </defs>
  </svg>
);
const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const FEATURES = [
  {
    id: 'chat',
    icon: <ChatIcon />,
    title: 'GeoChat AI',
    subtitle: 'Intelligent Spatial Assistant',
    description: 'Ask anything about industrial siting, GPCB regulations, location suitability, and environmental compliance across Gujarat.',
    cta: 'Open Chatbot',
    path: '/chat',
    gradient: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(99,102,241,0.1))',
    border: 'rgba(34,211,238,0.3)',
    glow: 'rgba(34,211,238,0.15)',
    accent: '#38BDF8',
    tag: 'AI Powered',
    tagBg: 'rgba(34,211,238,0.12)',
    tagColor: '#38BDF8',
    stats: ['Regulatory Queries', 'Location Analysis', 'GIS Intelligence'],
  },
  {
    id: 'nodes',
    icon: <NodeIcon />,
    title: 'Deployed Nodes',
    subtitle: 'Analysis Management Hub',
    description: 'View, explore and download all your saved geospatial analysis nodes. Access full suitability reports and map visualizations.',
    cta: 'View Nodes',
    path: '/nodes',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.08))',
    border: 'rgba(168,85,247,0.3)',
    glow: 'rgba(168,85,247,0.15)',
    accent: '#A855F7',
    tag: 'Data Archive',
    tagBg: 'rgba(168,85,247,0.12)',
    tagColor: '#A855F7',
    stats: ['Score Reports', 'PDF Export', 'Map Preview'],
  },
  {
    id: 'analysis',
    icon: <AnalysisIcon />,
    title: 'New Analysis',
    subtitle: 'Suitability Intelligence Engine',
    description: 'Select any location on the interactive map to run a full AI-powered industrial suitability analysis using LightGBM and MCDA models.',
    cta: 'Start Analysis',
    path: '/analysis',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(56,189,248,0.08))',
    border: 'rgba(16,185,129,0.3)',
    glow: 'rgba(16,185,129,0.15)',
    accent: '#10B981',
    tag: 'ML Powered',
    tagBg: 'rgba(16,185,129,0.12)',
    tagColor: '#10B981',
    stats: ['MCDA Scoring', 'LightGBM AI', 'GIS Proximity'],
  },
  {
    id: 'compare',
    icon: <CompareIcon />,
    title: 'Compare & Analyze',
    subtitle: 'Multi-Mode Location Intelligence',
    description: 'Compare two locations for the same industry, or evaluate one site across two industry types. Run full matrix comparisons for comprehensive insights.',
    cta: 'Start Comparing',
    path: '/compare',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.08))',
    border: 'rgba(245,158,11,0.3)',
    glow: 'rgba(245,158,11,0.15)',
    accent: '#F59E0B',
    tag: 'Multi-Mode',
    tagBg: 'rgba(245,158,11,0.12)',
    tagColor: '#F59E0B',
    stats: ['Two-Point Compare', 'Industry Matrix', 'PDF Reports'],
  },
];

function StatPill({ count, label }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '10px 16px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', background: 'var(--grad-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {count}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  );
}

function FeatureCard({ feature, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: hovered ? feature.gradient : 'rgba(15, 23, 42, 0.6)',
        border: `1px solid ${hovered ? feature.border : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '20px',
        padding: '32px 28px',
        cursor: 'pointer',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: hovered ? `0 20px 60px ${feature.glow}, 0 0 0 1px ${feature.border}` : '0 4px 24px rgba(0,0,0,0.4)',
        transform: hovered ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Background shimmer on hover */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '20px',
        background: hovered ? `radial-gradient(circle at 30% 20%, ${feature.glow}, transparent 70%)` : 'transparent',
        transition: 'opacity 0.3s',
        pointerEvents: 'none',
      }} />

      {/* Tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          padding: '4px 10px', borderRadius: '20px',
          background: feature.tagBg, color: feature.tagColor,
          fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em',
          border: `1px solid ${feature.border}`,
        }}>
          {feature.tag}
        </div>
      </div>

      {/* Icon + Title */}
      <div>
        <div style={{
          width: '60px', height: '60px', borderRadius: '16px',
          background: `${feature.tagBg}`,
          border: `1px solid ${feature.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: feature.accent,
          marginBottom: '16px',
          boxShadow: hovered ? `0 0 20px ${feature.glow}` : 'none',
          transition: 'box-shadow 0.3s',
        }}>
          {feature.icon}
        </div>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '800',
          color: 'var(--text-primary)', margin: '0 0 4px',
          letterSpacing: '-0.03em',
        }}>
          {feature.title}
        </h3>
        <p style={{ fontSize: '12px', color: feature.accent, fontWeight: '600', margin: 0, letterSpacing: '0.03em' }}>
          {feature.subtitle}
        </p>
      </div>

      {/* Description */}
      <p style={{
        fontSize: '14px', color: 'var(--text-secondary)',
        lineHeight: 1.65, margin: 0, flex: 1,
      }}>
        {feature.description}
      </p>

      {/* Capability Tags */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {feature.stats.map(s => (
          <span key={s} style={{
            fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-muted)',
          }}>
            {s}
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
          color: hovered ? feature.accent : 'var(--text-secondary)',
          transition: 'color 0.25s',
        }}>
          {feature.cta}
        </span>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: hovered ? feature.accent : 'rgba(255,255,255,0.06)',
          border: `1px solid ${hovered ? feature.accent : 'rgba(255,255,255,0.1)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: hovered ? '#000' : 'var(--text-muted)',
          transition: 'all 0.25s',
          transform: hovered ? 'translateX(4px)' : 'translateX(0)',
        }}>
          <ArrowIcon />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    api.get('projects/').then(r => setProjectCount(r.data?.length || 0)).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.profile?.full_name || user?.first_name || user?.username || 'Operator';
  const avatar = user?.profile?.avatar_url || user?.avatar_url;
  const initials = displayName[0]?.toUpperCase() || 'U';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      overflow: 'auto',
    }}>
      {/* Animated mesh background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(56,189,248,0.10) 0%, transparent 60%),
          radial-gradient(ellipse 50% 60% at 85% 80%, rgba(168,85,247,0.08) 0%, transparent 55%),
          radial-gradient(ellipse 40% 40% at 10% 70%, rgba(99,102,241,0.07) 0%, transparent 50%)
        `,
      }} />

      {/* Grid dot pattern overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.25,
        backgroundImage: 'radial-gradient(rgba(56,189,248,0.4) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* ── Navbar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 40px)',
        background: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(99,102,241,0.2))',
            border: '1px solid rgba(56,189,248,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px rgba(56,189,248,0.15)',
          }}>
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="url(#homeNavGl)" strokeWidth="2"/>
              <ellipse cx="24" cy="24" rx="9" ry="20" stroke="url(#homeNavGl)" strokeWidth="1.5"/>
              <line x1="4" y1="24" x2="44" y2="24" stroke="url(#homeNavGl)" strokeWidth="1.5"/>
              <defs><linearGradient id="homeNavGl" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#38BDF8"/><stop offset="100%" stopColor="#6366F1"/></linearGradient></defs>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '17px', letterSpacing: '-0.03em' }}>
            <span style={{ background: 'var(--grad-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GeoNexus</span>
            <span style={{ color: 'var(--text-primary)' }}> AI</span>
          </span>
        </div>

        {/* Right: User + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate('/analysis')}
            style={{
              padding: '7px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(56,189,248,0.3)'; e.currentTarget.style.color = 'var(--cyan)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            New Analysis
          </button>

          <button
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px 5px 5px',
              borderRadius: '24px', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(56,189,248,0.3)'; e.currentTarget.style.background = 'rgba(56,189,248,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            {avatar ? (
              <img src={avatar} alt="Avatar" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: 'var(--grad-brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '800', color: '#fff',
              }}>
                {initials}
              </div>
            )}
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
              {displayName}
            </span>
          </button>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px',
              borderRadius: '10px', background: 'rgba(244,63,94,0.07)',
              border: '1px solid rgba(244,63,94,0.2)', color: '#F43F5E',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.07)'; }}
          >
            <LogoutIcon />
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{
        position: 'relative', zIndex: 1,
        maxWidth: '1200px', margin: '0 auto',
        padding: 'clamp(48px, 8vw, 90px) clamp(16px, 4vw, 40px) clamp(32px, 5vw, 56px)',
        textAlign: 'center',
      }}>
        {/* Globe icon */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '96px', height: '96px', borderRadius: '28px',
          background: 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(168,85,247,0.08))',
          border: '1px solid rgba(56,189,248,0.2)',
          marginBottom: '28px',
          boxShadow: '0 0 40px rgba(56,189,248,0.15), 0 0 80px rgba(168,85,247,0.08)',
          animation: 'glow-pulse 3s ease-in-out infinite',
        }}>
          <GlobeIcon />
        </div>

        {/* Greeting */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 14px', borderRadius: '20px',
          background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
          marginBottom: '20px',
          fontSize: '13px', fontWeight: '600', color: 'var(--cyan)',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cyan)', animation: 'pulse-soft 1.5s infinite' }} />
          Welcome back, {displayName}
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 5.5vw, 64px)',
          fontWeight: '900', lineHeight: 1.08, letterSpacing: '-0.04em',
          margin: '0 0 20px',
        }}>
          <span style={{ background: 'var(--grad-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            GeoNexus
          </span>{' '}
          <span style={{ color: 'var(--text-primary)' }}>Intelligence</span>
          <br />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.7em', fontWeight: '700' }}>
            Platform
          </span>
        </h1>

        <p style={{
          fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--text-muted)',
          lineHeight: 1.7, maxWidth: '600px', margin: '0 auto 36px',
        }}>
          AI-powered geospatial intelligence for industrial siting decisions in Gujarat. Analyze, deploy, and query locations with precision.
        </p>

        {/* Quick Stats */}
        <div style={{
          display: 'inline-flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <StatPill count={projectCount} label="Nodes Deployed" />
          <StatPill count="MCDA + ML" label="Analysis Engine" />
          <StatPill count="Gujarat" label="Coverage Area" />
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section style={{
        position: 'relative', zIndex: 1,
        maxWidth: '1200px', margin: '0 auto',
        padding: '0 clamp(16px, 4vw, 40px) clamp(60px, 8vw, 100px)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          {FEATURES.map(f => (
            <FeatureCard key={f.id} feature={f} onClick={() => navigate(f.path)} />
          ))}
        </div>
      </section>

      {/* ── Footer note ── */}
      <footer style={{
        position: 'relative', zIndex: 1, textAlign: 'center',
        paddingBottom: '32px',
        fontSize: '12px', color: 'var(--text-faint)',
      }}>
        GeoNexus AI · Industrial Siting Intelligence for Gujarat · Powered by MCDA & LightGBM
      </footer>
    </div>
  );
}
