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

  const [theme, setTheme] = useState(() => localStorage.getItem('geonexus_theme') || 'dark');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('geonexus_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

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

  const handleSelectProject = (project) => {
    if (project.latitude != null && project.longitude != null) {
      const loc = { lat: project.latitude, lon: project.longitude };
      setSelectedLocation(loc);
      
      // Store in sessionStorage to persist state across reloads/components
      sessionStorage.setItem("analysisLocation", JSON.stringify(loc));
      
      // If description contains a valid saved analysis JSON, restore it!
      if (project.analysis_data) {
        setAnalysisResult(project.analysis_data);
        return;
      }

      // If description contains a valid saved analysis JSON, restore it!
      if (project.description) {
        try {
          const parsed = JSON.parse(project.description);
          const analysisData = parsed.analysis || (parsed.mcda_final_suitability_score || parsed.final_suitability_score ? parsed : null);
          if (analysisData && typeof analysisData === 'object') {
            setAnalysisResult(analysisData);
            return;
          }
        } catch (e) {
          // Plain description
        }
      }
      
      // Reset result panel if no saved analysis
      setAnalysisResult(null);
    }
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
          <button
            onClick={toggleTheme}
            className="btn-ghost"
            style={{
              padding: '6px 10px', borderRadius: 'var(--r-sm)',
              color: 'var(--text-primary)', border: '1px solid var(--border-subtle)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          <button
            onClick={() => navigate('/chat')}
            className="btn-ghost"
            style={{
              padding: '6px 14px', borderRadius: 'var(--r-sm)',
              background: 'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(59,130,246,0.1))',
              border: '1px solid rgba(34,211,238,0.3)',
              color: 'var(--cyan)', fontWeight: '600', fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '6px',
              cursor: 'pointer', transition: 'all 0.2s ease',
              boxShadow: '0 0 10px rgba(34,211,238,0.1)'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(59,130,246,0.2))'; e.currentTarget.style.boxShadow = '0 0 15px rgba(34,211,238,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(59,130,246,0.1))'; e.currentTarget.style.boxShadow = '0 0 10px rgba(34,211,238,0.1)'; }}
            title="Open GeoChat AI"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <path d="M12 11h.01M8 11h.01M16 11h.01"/>
            </svg>
            <span className="hide-mobile">GeoChat AI</span>
          </button>

          <button
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '5px 12px', borderRadius: 'var(--r-sm)',
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
              cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.background = 'rgba(34,211,238,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            title="Manage Profile"
          >
            {user?.profile?.avatar_url || user?.avatar_url ? (
              <img src={user?.profile?.avatar_url || user?.avatar_url} alt="Profile" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: 'var(--grad-brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '800', color: '#fff',
              }}>
                {(user?.profile?.full_name || user?.username || 'U')[0].toUpperCase()}
              </div>
            )}
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }} className="hide-mobile">
              {user?.profile?.full_name || user?.username || 'Operator'}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>

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
              <ProjectForm 
                onProjectCreated={fetchProjects} 
                selectedLocation={selectedLocation} 
                analysisResult={analysisResult} 
              />
            </div>

            {/* Scrollable Project Cards */}
            <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
              <ProjectList 
                projects={projects} 
                onSelectProject={handleSelectProject} 
                onDeleteProject={fetchProjects} 
              />
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
                  position: 'absolute', top: '16px', left: '16px', zIndex: 800,
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: 'rgba(11, 15, 25, 0.92)', border: '1px solid rgba(56, 189, 248, 0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)', cursor: 'pointer',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.5">
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
            <ResultsPanel result={analysisResult} onSave={fetchProjects} />
          </div>
        </div>

      </div>

      {/* Logout Confirmation */}
      {showLogout && <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />}
    </div>
  );
}