import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ParticleBackground from './ParticleBackground';

/* ── Navigation Icon Components ── */
const NavIcons = {
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  analysis: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
    </svg>
  ),
  compare: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  nodes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="5" r="2" /><circle cx="19" cy="19" r="2" /><circle cx="5" cy="19" r="2" />
      <line x1="12" y1="9" x2="12" y2="5" /><line x1="14.5" y1="13.5" x2="17.5" y2="17.5" /><line x1="9.5" y1="13.5" x2="6.5" y2="17.5" />
    </svg>
  ),
  chat: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  profile: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  chevron: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
};

/* ── Globe Logo SVG (Green themed) ── */
function GlobeLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" stroke="var(--c-green-700)" strokeWidth="2.5" />
      <ellipse cx="24" cy="24" rx="9" ry="20" stroke="var(--c-green-700)" strokeWidth="2" />
      <line x1="4" y1="24" x2="44" y2="24" stroke="var(--c-green-700)" strokeWidth="2" />
    </svg>
  );
}

/* ── Auth Layout (Login, Register, Forgot Password) ── */
function AuthLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden',
      width: '100vw'
    }}>
      {/* Particle background */}
      <ParticleBackground opacity={0.5} />

      {/* Decorative background pattern (green-tinted dots) */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.35,
        backgroundImage: 'radial-gradient(var(--c-sage-200) 1px, transparent 1px)',
        backgroundSize: '24px 24px', zIndex: 0
      }} />
      <div style={{
        position: 'absolute', top: '-120px', right: '-80px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, var(--c-mint-100) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-150px', left: '-100px',
        width: '350px', height: '350px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(97,135,100,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

/* ── Standard Dashboard Layout ── */
function DashboardLayout({ children, hideNav = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.profile?.full_name || user?.first_name || user?.username || 'Operator';
  const avatar = user?.profile?.avatar_url || user?.avatar_url;
  const initials = displayName[0]?.toUpperCase() || 'U';

  const menuItems = [
    { path: '/home', label: 'Home', icon: 'home' },
    { path: '/analysis', label: 'Analysis', icon: 'analysis' },
    { path: '/compare', label: 'Compare', icon: 'compare' },
    { path: '/nodes', label: 'Nodes', icon: 'nodes' },
    { path: '/chat', label: 'GeoChat', icon: 'chat' },
  ];

  const currentPath = location.pathname;
  const isActive = (path) => {
    if (path === '/home') return currentPath === '/home' || currentPath === '/dashboard';
    return currentPath.startsWith(path);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Particle background for dashboard */}
      <ParticleBackground opacity={0.35} />

      {/* ── Desktop Header / Navbar ── */}
      {!hideNav && (
        <header style={{
          position: 'sticky', top: 0, zIndex: 1000,
          height: 'var(--nav-h)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 clamp(16px, 4vw, 32px)',
          background: 'rgba(242, 247, 240, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          {/* Logo brand */}
          <Link to="/home" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'var(--c-mint-100)',
              border: '1px solid var(--c-sage-200)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GlobeLogo size={18} />
            </div>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: '850', fontSize: '18.5px',
              letterSpacing: '-0.025em', color: 'var(--text-primary)'
            }}>
              GeoNexus-Ai
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav style={{
            display: 'flex', gap: '8px', height: '100%', alignItems: 'center'
          }} className="hidden md:flex">
            {menuItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--r-md)',
                    fontSize: 'var(--fs-sm)',
                    fontWeight: active ? '600' : '500',
                    color: active ? 'var(--c-dark-900)' : 'var(--text-secondary)',
                    textDecoration: 'none',
                    background: active ? 'var(--c-mint-100)' : 'transparent',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.background = 'var(--c-mint-50)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={{ color: active ? 'var(--c-dark-900)' : 'var(--c-sage-400)', display: 'flex' }}>
                    {NavIcons[item.icon]}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Area: Profile Trigger + Mobile Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* User Profile dropdown */}
            {user && (
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '4px 12px 4px 4px',
                    borderRadius: 'var(--r-full)',
                    background: profileDropdownOpen ? 'var(--c-mint-50)' : 'transparent',
                    border: '1px solid transparent',
                    cursor: 'pointer', transition: 'all 0.15s',
                    fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-mint-50)'; }}
                  onMouseLeave={e => { if (!profileDropdownOpen) e.currentTarget.style.background = 'transparent'; }}
                >
                  {avatar ? (
                    <img src={avatar} alt="Avatar" style={{
                      width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover',
                      border: '1px solid var(--border-default)'
                    }} />
                  ) : (
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--c-green-600), var(--c-green-700))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '600', color: '#fff',
                    }}>
                      {initials}
                    </div>
                  )}
                  <span style={{
                    fontSize: 'var(--fs-sm)', fontWeight: '500',
                    color: 'var(--text-primary)', maxWidth: '120px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }} className="hidden sm:inline">
                    {displayName}
                  </span>
                  <span style={{
                    transition: 'transform 0.2s',
                    transform: profileDropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                    display: 'flex'
                  }}>
                    {NavIcons.chevron}
                  </span>
                </button>

                {/* Dropdown menu */}
                {profileDropdownOpen && (
                  <div className="anim-scaleIn" style={{
                    position: 'absolute', right: 0, marginTop: '8px', width: '220px',
                    background: 'var(--c-surface)', border: '1px solid var(--border-default)',
                    borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 1001,
                    overflow: 'hidden', padding: '6px'
                  }}>
                    {/* User info header */}
                    <div style={{
                      padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)',
                      marginBottom: '6px', display: 'flex', flexDirection: 'column'
                    }}>
                      <span style={{ fontSize: 'var(--fs-sm)', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.2' }}>
                        {displayName}
                      </span>
                      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {user.email || 'Operator'}
                      </span>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', borderRadius: 'var(--r-sm)',
                        color: 'var(--text-secondary)', textDecoration: 'none',
                        fontSize: 'var(--fs-sm)', fontWeight: '500', transition: 'all 0.1s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-mint-50)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      <span style={{ color: 'var(--c-sage-400)' }}>{NavIcons.profile}</span>
                      Account Settings
                    </Link>
                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '6px 0' }} />
                    <button
                      onClick={() => { setProfileDropdownOpen(false); handleLogout(); }}
                      style={{
                        width: '100%', textAlign: 'left', background: 'none', border: 'none',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', borderRadius: 'var(--r-sm)',
                        color: 'var(--c-error)', fontSize: 'var(--fs-sm)', fontWeight: '500',
                        cursor: 'pointer', transition: 'all 0.1s', fontFamily: 'var(--font-sans)'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-error-light)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ color: 'var(--c-error)' }}>{NavIcons.logout}</span>
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden"
              style={{
                background: 'none', border: 'none', color: 'var(--text-primary)',
                cursor: 'pointer', padding: '8px', zIndex: 1002, borderRadius: 'var(--r-md)',
              }}
            >
              {mobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </header>
      )}

      {/* ── Mobile Sidebar Drawer ── */}
      {mobileMenuOpen && !hideNav && (
        <>
          {/* Backdrop (dark green tinted) */}
          <div
            className="anim-fadeIn"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(26, 43, 37, 0.5)',
              backdropFilter: 'blur(2px)',
              zIndex: 998,
            }}
          />
          {/* Drawer panel */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: '280px', maxWidth: '85vw',
            background: 'var(--c-surface)',
            borderLeft: '1px solid var(--border-default)',
            padding: '80px 16px 24px',
            display: 'flex', flexDirection: 'column', gap: '8px',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 999,
            animation: 'slideInRight 0.2s var(--ease-out) both',
          }}>
            <div style={{
              fontSize: 'var(--fs-xs)', fontWeight: '600', color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              padding: '0 12px', marginBottom: '4px'
            }}>
              Menu
            </div>
            {menuItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    padding: '12px 14px', borderRadius: 'var(--r-md)',
                    fontSize: 'var(--fs-base)', fontWeight: active ? '600' : '500',
                    color: active ? 'var(--c-dark-900)' : 'var(--text-secondary)',
                    textDecoration: 'none',
                    background: active ? 'var(--c-mint-50)' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ color: active ? 'var(--c-dark-900)' : 'var(--c-sage-400)' }}>
                    {NavIcons[item.icon]}
                  </span>
                  {item.label}
                </Link>
              );
            })}
            
            <div style={{ flex: 1 }} />
            
            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '12px 0' }} />
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: '12px 14px', borderRadius: 'var(--r-md)',
                fontSize: 'var(--fs-base)', fontWeight: '500',
                color: 'var(--text-secondary)', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}
            >
              <span style={{ color: 'var(--c-sage-400)' }}>{NavIcons.profile}</span>
              Settings
            </Link>
            <button
              onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--c-error-light)', border: 'none',
                color: 'var(--c-error)', fontSize: 'var(--fs-base)', fontWeight: '500',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                fontFamily: 'var(--font-sans)', transition: 'all 0.15s'
              }}
            >
              <span style={{ color: 'var(--c-error)' }}>{NavIcons.logout}</span>
              Log Out
            </button>
          </div>
        </>
      )}

      {/* ── Main Viewport Content ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {children}
      </main>

      {/* ── Footer ── */}
      {!hideNav && (
        <footer className="no-print" style={{
          textAlign: 'center', padding: '24px 16px',
          fontSize: 'var(--fs-sm)', color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(242, 247, 240, 0.8)',
          backdropFilter: 'blur(8px)',
          position: 'relative', zIndex: 1,
        }}>
          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>GeoNexus-Ai</span>
          <span style={{ margin: '0 8px', color: 'var(--border-bright)' }}>|</span>
          Enterprise Siting Intelligence
        </footer>
      )}
    </div>
  );
}

/* ── Main Layout Wrapper ── */
export default function Layout({ children, authTheme = false, hideNav = false }) {
  if (authTheme) {
    return <AuthLayout>{children}</AuthLayout>;
  }
  return <DashboardLayout hideNav={hideNav}>{children}</DashboardLayout>;
}
