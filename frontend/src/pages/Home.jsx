import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Common/Layout';

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
    <circle cx="24" cy="24" r="20" stroke="var(--c-green-700)" strokeWidth="2.5"/>
    <ellipse cx="24" cy="24" rx="9" ry="20" stroke="var(--c-green-700)" strokeWidth="2"/>
    <line x1="4" y1="24" x2="44" y2="24" stroke="var(--c-green-700)" strokeWidth="2"/>
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
    bg: 'var(--c-surface)',
    hoverBg: 'var(--c-surface-hover)',
    border: 'var(--c-primary-200)',
    accent: 'var(--c-primary-600)',
    tag: 'AI Powered',
    tagBg: 'var(--c-primary-50)',
    tagColor: 'var(--c-primary-700)',
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
    bg: 'var(--c-surface)',
    hoverBg: 'var(--c-surface-hover)',
    border: 'var(--c-neutral-200)',
    accent: 'var(--c-neutral-700)',
    tag: 'Data Archive',
    tagBg: 'var(--c-neutral-100)',
    tagColor: 'var(--c-neutral-800)',
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
    bg: 'var(--c-surface)',
    hoverBg: 'var(--c-surface-hover)',
    border: 'var(--c-success-light)',
    accent: 'var(--c-success)',
    tag: 'ML Powered',
    tagBg: 'var(--c-success-light)',
    tagColor: 'var(--c-success)',
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
    bg: 'var(--c-surface)',
    hoverBg: 'var(--c-surface-hover)',
    border: 'var(--c-accent-200)',
    accent: 'var(--c-accent-600)',
    tag: 'Multi-Mode',
    tagBg: 'var(--c-accent-50)',
    tagColor: 'var(--c-accent-700)',
    stats: ['Two-Point Compare', 'Industry Matrix', 'PDF Reports'],
  },
];

function StatPill({ count, label }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '12px 20px',
      background: 'var(--c-surface)',
      borderRadius: 'var(--r-lg)',
      border: '1px solid var(--border-subtle)',
      minWidth: '120px',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ fontSize: '24px', fontWeight: '850', fontFamily: 'var(--font-display)', color: 'var(--c-primary-700)' }}>
        {count}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '750', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
        background: hovered ? feature.hoverBg : feature.bg,
        border: `1px solid ${hovered ? feature.border : 'var(--border-default)'}`,
        borderRadius: 'var(--r-2xl)',
        padding: '30px 26px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: hovered ? 'var(--shadow-lg)' : 'var(--shadow-card)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      {/* Tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          padding: '4px 10px', borderRadius: 'var(--r-xl)',
          background: feature.tagBg, color: feature.tagColor,
          fontSize: '11px', fontWeight: '700', letterSpacing: '0.04em',
          border: `1px solid ${feature.border}`,
        }}>
          {feature.tag}
        </div>
      </div>

      {/* Icon & Title */}
      <div>
        <div style={{
          width: '56px', height: '56px', borderRadius: 'var(--r-lg)',
          background: feature.tagBg,
          border: `1px solid ${feature.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: feature.accent,
          marginBottom: '14px',
        }}>
          {feature.icon}
        </div>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '800',
          color: 'var(--text-primary)', margin: '0 0 2px',
          letterSpacing: '-0.02em',
        }}>
          {feature.title}
        </h3>
        <p style={{ fontSize: '11.5px', color: feature.accent, fontWeight: '700', margin: 0, letterSpacing: '0.03em' }}>
          {feature.subtitle}
        </p>
      </div>

      {/* Description */}
      <p style={{
        fontSize: '13.5px', color: 'var(--text-secondary)',
        lineHeight: 1.6, margin: 0, flex: 1,
      }}>
        {feature.description}
      </p>

      {/* Stats pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {feature.stats.map(s => (
          <span key={s} style={{
            fontSize: '10.5px', padding: '4px 8px', borderRadius: 'var(--r-sm)',
            background: 'var(--c-surface-alt)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            fontWeight: '600'
          }}>
            {s}
          </span>
        ))}
      </div>

      {/* CTA Trigger */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '14px', borderTop: '1px solid var(--border-subtle)',
      }}>
        <span style={{
          fontSize: '13px', fontWeight: '750',
          color: hovered ? feature.accent : 'var(--text-secondary)',
          transition: 'color 0.25s',
        }}>
          {feature.cta}
        </span>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: hovered ? feature.accent : 'var(--c-surface-alt)',
          border: `1px solid ${hovered ? feature.accent : 'var(--border-subtle)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: hovered ? 'var(--text-primary)' : 'var(--text-muted)',
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    api.get('projects/')
      .then(r => setProjectCount(r.data?.length || 0))
      .catch(() => {});
  }, []);

  const displayName = user?.profile?.full_name || user?.first_name || user?.username || 'Operator';

  return (
    <Layout>
      {/* Hero section */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'clamp(40px, 6vw, 72px) clamp(16px, 4vw, 40px) clamp(24px, 4vw, 48px)',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'bloc', alignItems: 'center', gap: '8px',
          padding: '6px 14px', borderRadius: 'var(--r-xl)',
          background: 'var(--c-primary-50)', border: '1px solid var(--c-primary-200)',
          marginBottom: '20px',
          fontSize: '15 px', fontWeight: '750', color: 'var(--c-primary-700)',
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--c-primary-500)' }} />
          Welcome back, {displayName}
        </div>
        

        

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 5vw, 60px)',
          fontWeight: '900', lineHeight: 1.1, letterSpacing: '-0.03em',
          margin: '0 0 16px',
        }}>
          <span style={{ color: 'var(--c-primary-600)' }}>GeoNexus</span>{' '}
          <span style={{ color: 'var(--text-primary)' }}>Intelligence Suite</span>
        </h1>

        <p style={{
          fontSize: 'clamp(14px, 1.8vw, 17px)', color: 'var(--text-muted)',
          lineHeight: 1.7, maxWidth: '600px', margin: '0 auto 36px',
        }}>
          AI-powered spatial computing and multi-criteria suitability analysis for industrial facility siting in Gujarat.
        </p>

        {/* Stats Pills */}
        <div style={{
          display: 'inline-flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <StatPill count={projectCount} label="Nodes Deployed" />
          <StatPill count="MCDA + ML" label="Analysis Core" />
          <StatPill count="Gujarat" label="Active Area" />
        </div>
      </section>

      {/* Grid of features */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 clamp(16px, 4vw, 40px) clamp(48px, 6vw, 80px)',
        width: '100%'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {FEATURES.map(f => (
            <FeatureCard key={f.id} feature={f} onClick={() => navigate(f.path)} />
          ))}
        </div>
      </section>
    </Layout>
  );
}
