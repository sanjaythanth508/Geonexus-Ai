import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/Map/MapComponent';
import ProjectList from '../components/Projects/ProjectList';
import ProjectForm from '../components/Projects/ProjectForm';
import AnalysisPanel from "../components/Analysis/AnalysisPanel";
import ResultsPanel from "../components/Analysis/ResultsPanel";

/* ── Logout Confirmation Modal ── */
function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="anim-fadeIn" style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(5, 8, 15, 0.75)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div className="glass-bright anim-scaleIn" style={{
        width: '100%', maxWidth: '380px',
        borderRadius: 'var(--r-xl)', overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ height: '3px', background: 'var(--grad-brand)' }} />
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>Sign Out?</h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
            You'll need to sign in again to access your projects and map assets.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onCancel} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button onClick={onConfirm} style={{
              flex: 1, padding: '10px 18px', borderRadius: 'var(--r-sm)',
              border: 'none', background: 'var(--red)', color: '#fff',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
              letterSpacing: '0.02em', boxShadow: '0 4px 12px rgba(239,68,68,0.25)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--red-dark)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--red)'}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Location Status Badge ── */
function LocationBadge() {
  const [hasLocation, setHasLocation] = useState(false);
  useEffect(() => {
    setHasLocation(!!sessionStorage.getItem('analysisLocation'));
    const interval = setInterval(() => {
      setHasLocation(!!sessionStorage.getItem('analysisLocation'));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`badge ${hasLocation ? 'badge-green' : 'badge-muted'}`}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: hasLocation ? 'var(--emerald)' : 'var(--text-muted)',
        animation: hasLocation ? 'pulse-soft 1.5s infinite' : 'none',
      }} />
      <span>{hasLocation ? 'Geo Locked' : 'Select Target'}</span>
    </div>
  );
}

export default function Dashboard() {
  const [projects, setProjects]     = useState([]);
  const [showLogout, setShowLogout] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── NEW: state for location selection and analysis results ──
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Resize listener for responsive layout adjustments
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false); // Close sidebar by default on mobile viewports
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('projects/');
      setProjects(res.data);
    } catch { /* silent fallback */ }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ── Convert projects to markers for the map ──
  const projectMarkers = projects
    .filter(p => p.latitude != null && p.longitude != null)
    .map(p => ({
      lat: p.latitude,
      lon: p.longitude,
      label: p.name,
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>

      {/* ─── Top Navigation Bar ─── (unchanged) */}
      <header style={{
        height: 'var(--nav-h)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(12px, 3vw, 24px)',
        background: 'rgba(10, 14, 26, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        zIndex: 100,
        boxShadow: 'var(--shadow-xs)',
      }}>
        {/* Left: Brand + Hamburger Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', padding: '8px', borderRadius: 'var(--r-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            title={sidebarOpen ? 'Minimize Control Desk' : 'Expand Control Desk'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {/* Logo Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(59,130,246,0.2))',
              border: '1px solid rgba(34,211,238,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 12px rgba(34,211,238,0.15)',
            }}>
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="url(#navGl)" strokeWidth="2"/>
                <ellipse cx="24" cy="24" rx="9" ry="20" stroke="url(#navGl)" strokeWidth="1.5"/>
                <line x1="4" y1="24" x2="44" y2="24" stroke="url(#navGl)" strokeWidth="1.5"/>
                <defs><linearGradient id="navGl" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#22D3EE"/><stop offset="100%" stopColor="#3B82F6"/></linearGradient></defs>
              </svg>
            </div>
            <span style={{ fontWeight: '800', fontSize: '16px', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }} className="hide-mobile">
              <span className="gradient-text-static">GeoNexus</span>
              <span style={{ color: 'var(--text-primary)' }}> AI</span>
            </span>
          </div>
        </div>

        {/* Center: Interactive Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LocationBadge />
          <div className="badge badge-cyan hide-mobile">
            <span style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: 'var(--cyan)', marginRight: '2px',
            }} />
            <span>{projects.length} System Nodes</span>
          </div>
        </div>

        {/* Right: User Menu + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '5px 10px', borderRadius: 'var(--r-sm)',
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
          }} className="hide-mobile">
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%',
              background: 'var(--grad-brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: '800', color: '#fff',
            }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
              {user?.username || 'Operator'}
            </span>
          </div>

          <button
            onClick={() => setShowLogout(true)}
            className="btn-ghost"
            style={{ padding: '8px 12px', gap: '5px', fontSize: '12px', height: '34px', background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.15)' }}
            title="Terminate Session"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span style={{ color: 'var(--text-primary)' }}>Exit</span>
          </button>
        </div>
      </header>

      {/* ─── Main Work Workspace ─── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Sidebar Container (unchanged) */}
        <aside style={{
          width: sidebarOpen ? 'var(--sidebar-w)' : '0',
          position: isMobile ? 'absolute' : 'relative',
          top: 0, bottom: 0, left: 0,
          zIndex: 900,
          flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          transition: 'width 0.3s var(--ease-out)',
          boxShadow: isMobile && sidebarOpen ? '10px 0 30px rgba(0,0,0,0.5)' : 'none',
        }}>
          <div style={{ width: 'var(--sidebar-w)', height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* Sidebar Form Panel */}
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Initialize Asset
                </span>
                {isMobile && (
                  <button
                    onClick={() => setSidebarOpen(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
              <ProjectForm onProjectCreated={fetchProjects} />
            </div>

            {/* Scrollable Project Cards */}
            <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
              <ProjectList projects={projects} />
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile drawer (unchanged) */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'absolute', inset: 0, zIndex: 850,
              background: 'rgba(5, 8, 15, 0.6)', backdropFilter: 'blur(4px)',
            }}
          />
        )}

        {/* ─── Main Content Area: Map + Analysis Panels ─── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          overflow: 'hidden',
          height: '100%',
        }}>
          {/* Map Container (2/3 width on desktop, full height on mobile) */}
          <div style={{
            flex: isMobile ? '1' : '2',
            position: 'relative',
            height: isMobile ? '60%' : '100%',
            minHeight: '300px',
            overflow: 'hidden',
          }}>
            {isMobile && !sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  position: 'absolute', top: '76px', left: '10px', zIndex: 800,
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: '#ffffff', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)', cursor: 'pointer',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </button>
            )}
            <MapComponent
              onLocationSelect={setSelectedLocation}
              markers={projectMarkers}
            />
          </div>

          {/* Right Panel: Analysis & Results (1/3 width on desktop, rest on mobile) */}
          <div style={{
            flex: isMobile ? '1' : '1',
            padding: '16px',
            overflowY: 'auto',
            background: 'var(--bg-secondary)',
            borderLeft: isMobile ? 'none' : '1px solid var(--border-subtle)',
            height: isMobile ? '40%' : '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <AnalysisPanel
              location={selectedLocation}
              onResult={setAnalysisResult}
            />
            <ResultsPanel result={analysisResult} />
          </div>
        </div>

      </div>

      {/* Logout Confirmation */}
      {showLogout && <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />}
    </div>
  );
}