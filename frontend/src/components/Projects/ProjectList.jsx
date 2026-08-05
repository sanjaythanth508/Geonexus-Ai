const CARD_COLORS = [
  { from: '#22D3EE', to: '#3B82F6' }, // cyan -> blue
  { from: '#A78BFA', to: '#F472B6' }, // purple -> pink
  { from: '#34D399', to: '#059669' }, // emerald -> forest
  { from: '#FB923C', to: '#EF4444' }, // orange -> red
  { from: '#FCD34D', to: '#D97706' }, // yellow -> amber
];

function getGradient(id, index) {
  return CARD_COLORS[(id || index || 0) % CARD_COLORS.length];
}

function ProjectCard({ project, index }) {
  const colors = getGradient(project.id, index);
  const letter = (project.name || 'P').trim()[0].toUpperCase();

  return (
    <div
      className="anim-fadeUp"
      style={{
        display: 'flex', gap: '14px', alignItems: 'center',
        padding: '14px', borderRadius: 'var(--r-md)',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-subtle)',
        transition: 'all 0.25s var(--ease-out)',
        animationDelay: `${index * 0.05}s`,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.35)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Decorative vertical color gradient line */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
        background: `linear-gradient(to bottom, ${colors.from}, ${colors.to})`,
      }}/>

      {/* Avatar Node */}
      <div style={{
        width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0,
        background: `linear-gradient(135deg, ${colors.from}15, ${colors.to}15)`,
        border: `1px solid ${colors.from}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: '800', color: colors.from,
        boxShadow: `0 0 10px ${colors.from}10`,
      }}>
        {letter}
      </div>

      {/* Info details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{
          fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)',
          marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {project.name}
        </h4>
        {project.description ? (
          <p style={{
            fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {project.description}
          </p>
        ) : (
          <p style={{ fontSize: '11.5px', color: 'var(--text-faint)', fontStyle: 'italic' }}>
            No coordinates specified
          </p>
        )}
      </div>

      {/* Chevron indicator */}
      <div style={{ color: 'var(--text-faint)', flexShrink: 0 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>
  );
}

function EmptyNodes() {
  return (
    <div className="anim-fadeUp" style={{ textAlign: 'center', padding: '36px 12px' }}>
      <div style={{
        width: '56px', height: '56px', borderRadius: '16px',
        background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-default)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px', animation: 'float 4s ease-in-out infinite',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
        </svg>
      </div>
      <h5 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>
        No Project Nodes
      </h5>
      <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Deploy a project node using the entry form to index spatial data assets.
      </p>
    </div>
  );
}

export default function ProjectList({ projects }) {
  if (!projects.length) return <EmptyNodes />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {projects.map((p, idx) => (
        <ProjectCard key={p.id ?? idx} project={p} index={idx} />
      ))}
    </div>
  );
}