import api from '../../api/client';

const CARD_COLORS = [
  { from: 'var(--c-primary-500)', to: 'var(--c-primary-600)' },
  { from: 'var(--c-accent-500)', to: 'var(--c-accent-600)' },
  { from: 'var(--c-success)', to: 'var(--c-success)' },
  { from: 'var(--c-warning)', to: 'var(--c-warning)' },
  { from: 'var(--c-info)', to: 'var(--c-info)' },
];

function getGradient(id, index) {
  return CARD_COLORS[(id || index || 0) % CARD_COLORS.length];
}

function ProjectCard({ project, index, onSelect, onDelete }) {
  const colors = getGradient(project.id, index);
  const letter = (project.name || 'P').trim()[0].toUpperCase();

  let displayDesc = project.description;
  let scoreBadge = null;
  let analysisData = project.analysis_data;

  // Fallback for older projects where analysis data was stored as a JSON string inside description
  if (!analysisData && project.description) {
    try {
      const parsed = JSON.parse(project.description);
      analysisData = parsed.analysis || (parsed.mcda_final_suitability_score || parsed.final_suitability_score ? parsed : null);
      if (analysisData) {
        displayDesc = parsed.notes || "";
      }
    } catch (e) {
      // Not JSON, description is treated as plain text
    }
  }

  if (analysisData) {
    const score = analysisData.mcda_final_suitability_score || analysisData.final_suitability_score;
    const ind = analysisData.industry_type || analysisData.industry;
    displayDesc = `${ind || 'Industry'} Siting Analysis` + (displayDesc ? ` - ${displayDesc}` : '');
    if (score != null) {
      scoreBadge = (
        <span style={{
          fontSize: '10.5px',
          padding: '2px 6px',
          borderRadius: '4px',
          background: 'var(--c-info-light)',
          border: '1px solid var(--c-info)',
          color: 'var(--c-info)',
          fontWeight: '800',
          marginLeft: '8px'
        }}>
          {Number(score).toFixed(1)}/100
        </span>
      );
    }
  }

  const coordsLabel = (project.latitude != null && project.longitude != null)
    ? `(${Number(project.latitude).toFixed(3)}°, ${Number(project.longitude).toFixed(3)}°)`
    : null;

  return (
    <div
      className="anim-fadeUp card-interactive"
      onClick={onSelect}
      style={{
        display: 'flex', gap: '14px', alignItems: 'center',
        padding: '14px', borderRadius: 'var(--r-md)',
        background: 'var(--c-surface)',
        border: '1px solid var(--border-default)',
        transition: 'all 0.25s var(--ease-out)',
        animationDelay: `${index * 0.05}s`,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-bright)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
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
        background: `var(--c-surface-alt)`,
        border: `1px solid var(--border-subtle)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: '800', color: colors.from,
      }}>
        {letter}
      </div>

      {/* Info details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{
          fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)',
          marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
          {scoreBadge}
        </h4>
        {coordsLabel && (
          <div style={{ fontSize: '11px', color: 'var(--c-primary-600)', fontWeight: '600', marginBottom: '2px' }}>
            {coordsLabel}
          </div>
        )}
        {displayDesc ? (
          <p style={{
            fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {displayDesc}
          </p>
        ) : (
          <p style={{ fontSize: '11.5px', color: 'var(--text-faint)', fontStyle: 'italic' }}>
            No analysis data captured
          </p>
        )}
      </div>

      {/* Delete Icon Button */}
      <button
        onClick={async (e) => {
          e.stopPropagation();
          if (window.confirm(`Delete project node "${project.name}"?`)) {
            try {
              await api.delete(`projects/${project.id}/`);
              onDelete?.();
            } catch {
              alert("Failed to delete project node.");
            }
          }
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--c-error-light)',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--c-error)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--c-error-light)'}
        title="Delete Node"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>
    </div>
  );
}

function EmptyNodes() {
  return (
    <div className="anim-fadeUp" style={{ textAlign: 'center', padding: '36px 12px' }}>
      <div style={{
        width: '56px', height: '56px', borderRadius: '16px',
        background: 'var(--c-surface-alt)', border: '1px dashed var(--border-default)',
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

export default function ProjectList({ projects, onSelectProject, onDeleteProject }) {
  if (!projects.length) return <EmptyNodes />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {projects.map((p, idx) => (
        <ProjectCard 
          key={p.id ?? idx} 
          project={p} 
          index={idx} 
          onSelect={() => onSelectProject?.(p)} 
          onDelete={() => onDeleteProject?.(p.id)}
        />
      ))}
    </div>
  );
}