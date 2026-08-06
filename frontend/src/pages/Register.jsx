import { useState, useEffect, useRef, useCallback } from 'react';
import { register, loginWithGoogle } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

/* ═══════════════════════════════════════════════
   PARTICLES BACKGROUND
═══════════════════════════════════════════════ */
function ParticleField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;
    let animId;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${p.alpha})`; 
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(139,92,246,${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };

    draw();
    const onResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none',
    }} />
  );
}

/* ═══════════════════════════════════════════════
   ANIMATED LOGO GLOBE
═══════════════════════════════════════════════ */
function GlobeIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="lg-globe-reg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6"/>
          <stop offset="50%" stopColor="#3B82F6"/>
          <stop offset="100%" stopColor="#22D3EE"/>
        </linearGradient>
        <filter id="glow-filter-reg">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      <circle cx="24" cy="24" r="20" stroke="url(#lg-globe-reg)" strokeWidth="1.5" fill="none" filter="url(#glow-filter-reg)"/>
      <ellipse cx="24" cy="24" rx="10" ry="20" stroke="url(#lg-globe-reg)" strokeWidth="1.5" fill="none"/>
      <line x1="4" y1="24" x2="44" y2="24" stroke="url(#lg-globe-reg)" strokeWidth="1.5"/>
      <line x1="8" y1="15" x2="40" y2="15" stroke="url(#lg-globe-reg)" strokeWidth="1" strokeDasharray="2 2"/>
      <line x1="8" y1="33" x2="40" y2="33" stroke="url(#lg-globe-reg)" strokeWidth="1" strokeDasharray="2 2"/>
      <circle cx="24" cy="24" r="3.5" fill="url(#lg-globe-reg)"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   ICONS
═══════════════════════════════════════════════ */
const UserIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const MailIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const LockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const EyeIcon  = ({open}) => open
  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const UserPlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
const AlertIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const PhoneIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const BuildingIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="6" x2="9.01" y2="6"/><line x1="15" y1="6" x2="15.01" y2="6"/><line x1="9" y1="10" x2="9.01" y2="10"/><line x1="15" y1="10" x2="15.01" y2="10"/><line x1="9" y1="14" x2="9.01" y2="14"/><line x1="15" y1="14" x2="15.01" y2="14"/><line x1="9" y1="18" x2="9.01" y2="18"/><line x1="15" y1="18" x2="15.01" y2="18"/></svg>;
const BriefcaseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
const MapPinIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;

function LoadSpinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        style={{ animation: 'spin 0.75s linear infinite', transformOrigin:'center' }}/>
    </svg>
  );
}

function getStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const map = [
    { label: '', color: 'transparent' },
    { label: 'Weak password', color: '#EF4444' },
    { label: 'Fair security', color: '#F97316' },
    { label: 'Good configuration', color: '#EAB308' },
    { label: 'Highly secure key', color: '#10B981' },
  ];
  return { score, ...map[score] };
}

function Orbs() {
  return (
    <>
      <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:'500px', height:'500px', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)', pointerEvents:'none', animation:'floatSlow 8s ease-in-out infinite' }} />
      <div style={{ position:'absolute', top:'-15%', right:'-8%', width:'600px', height:'600px', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 65%)', pointerEvents:'none', animation:'floatSlow 10s ease-in-out infinite 3s' }} />
    </>
  );
}

function OrbitRings() {
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
      {[220, 340, 460].map((r, i) => (
        <div key={i} style={{
          position:'absolute', top:'50%', left:'50%',
          width:`${r}px`, height:`${r}px`,
          marginLeft:`${-r/2}px`, marginTop:`${-r/2}px`,
          borderRadius:'50%',
          border:`1px solid rgba(139,92,246,${0.04 - i * 0.01})`,
          animation:`spin ${30 + i * 15}s linear infinite ${i % 2 === 0 ? '' : 'reverse'}`,
        }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN REGISTER PAGE
═══════════════════════════════════════════════ */
export default function Register() {
  const location = useLocation();
  const initialGoogleInfo = location.state?.googleInfo || null;

  const [username, setUsername] = useState(initialGoogleInfo?.email || '');
  const [fullName, setFullName] = useState(initialGoogleInfo?.full_name || '');
  const [email,    setEmail]    = useState(initialGoogleInfo?.email || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone]       = useState('');
  const [organization, setOrganization] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [bio, setBio]           = useState('');

  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [step,     setStep]     = useState(0);
  const [formTab,  setFormTab]  = useState(1); // Step 1: Core, Step 2: Professional

  const { loginWithTokens } = useAuth();
  const navigate = useNavigate();
  const btnRef = useRef(null);

  const isGoogleMode = !!initialGoogleInfo;
  const strength = getStrength(password);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 80);
    const t2 = setTimeout(() => setStep(2), 280);
    const t3 = setTimeout(() => setStep(3), 480);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handleRipple = useCallback((e) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rEl = document.createElement('span');
    Object.assign(rEl.style, {
      position:'absolute', left:`${x}px`, top:`${y}px`,
      width:'6px', height:'6px', marginLeft:'-3px', marginTop:'-3px',
      background:'rgba(255,255,255,0.5)', borderRadius:'50%',
      animation:'ripple 0.7s ease-out forwards', pointerEvents:'none',
    });
    btn.appendChild(rEl);
    setTimeout(() => rEl.remove(), 700);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      username: username || email,
      email: email,
      password: password || undefined,
      full_name: fullName,
      phone: phone,
      organization: organization,
      job_title: jobTitle,
      location: userLocation,
      bio: bio,
      avatar_url: initialGoogleInfo?.avatar_url || ''
    };

    try {
      const res = await register(payload);
      if (res.data?.access) {
        loginWithTokens(res.data, fullName || username);
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Username or email may already be registered.');
      setShakeKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');
    try {
      const res = await loginWithGoogle(credentialResponse.credential);
      const data = res.data;
      loginWithTokens(data, data.user?.username || 'Google User');
      
      if (data.is_new_user) {
        // Redirect to finish registration with prefilled Google info
        navigate('/register', { state: { googleInfo: data.google_info } });
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Google Authentication failed.');
      setShakeKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const tf = { transition: 'opacity 0.5s var(--ease-out), transform 0.5s var(--ease-out)' };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: `var(--grad-mesh), var(--bg-primary)`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <ParticleField />
      <Orbs />

      <div className="hide-mobile" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        position: 'relative',
        zIndex: 2,
      }}>
        <OrbitRings />
        <div style={{ textAlign: 'center', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
          <div className="anim-floatSlow" style={{ marginBottom: '28px', animation: 'float 6s ease-in-out infinite' }}>
            <GlobeIcon size={100} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: '800', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '16px' }}>
            <span className="gradient-text">{isGoogleMode ? 'Complete Your Profile' : 'Join GeoNexus AI'}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.75 }}>
            {isGoogleMode 
              ? 'We imported your details from Google! Fill in your remaining profile information to activate your operator desk.'
              : 'Create an account to deploy geospatial insights, store custom analysis markers, and generate interactive intelligence maps.'
            }
          </p>

          {isGoogleMode && initialGoogleInfo?.avatar_url && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '12px', marginTop: '24px',
              padding: '8px 16px', borderRadius: 'var(--r-full)',
              background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)'
            }}>
              <img src={initialGoogleInfo.avatar_url} alt="Google Avatar" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--cyan)' }}>Verified via Google</span>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '28px' }}>
            {['🔒 Secure Storage', '🛰️ Satellite Views', '⚡ Instant Processing', '📈 Scale Analytics'].map(f => (
              <div key={f} style={{
                padding: '7px 14px', borderRadius: 'var(--r-full)',
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)',
                fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500',
              }}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="hide-mobile" style={{
        width: '1px',
        background: 'linear-gradient(to bottom, transparent, var(--border-subtle) 20%, var(--border-subtle) 80%, transparent)',
        alignSelf: 'stretch',
        margin: '60px 0',
      }}/>

      <div style={{
        width: 'clamp(340px, 50%, 560px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(20px, 4vw, 50px) clamp(16px, 4vw, 50px)',
        position: 'relative',
        zIndex: 2,
        flexShrink: 0,
      }}
      className="form-container"
      >
        <div style={{ width: '100%', maxWidth: '440px' }}>

          <div className="show-mobile" style={{
            display: 'none', flexDirection: 'column', alignItems: 'center',
            marginBottom: '24px', textAlign: 'center',
            ...tf,
            opacity: step >= 1 ? 1 : 0,
            transform: step >= 1 ? 'none' : 'translateY(16px)',
          }}>
            <div style={{ marginBottom: '10px' }}><GlobeIcon size={52} /></div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.03em' }}>
              <span className="gradient-text">GeoNexus AI</span>
            </h1>
          </div>

          <div style={{ marginBottom: '24px', ...tf, opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? 'none' : 'translateY(20px)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,2.8vw,26px)', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '6px' }}>
              {isGoogleMode ? 'Complete Sign-Up 🚀' : 'Create Account 🛰️'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>
              {isGoogleMode ? 'Review your Google details and finish setting up' : 'Register to access the visualization suite'}
            </p>
          </div>

          <div
            key={shakeKey}
            className={`glass-bright ${error && shakeKey ? 'anim-shake' : ''}`}
            style={{
              borderRadius: 'var(--r-xl)',
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07)',
              ...tf,
              opacity: step >= 2 ? 1 : 0,
              transform: step >= 2 ? 'none' : 'translateY(24px)',
            }}
          >
            <div style={{
              height: '3px',
              background: 'linear-gradient(90deg, #8B5CF6, #3B82F6, #22D3EE, #8B5CF6)',
              backgroundSize: '300% 100%',
              animation: 'gradient-flow 4s ease infinite',
            }} />

            <div style={{ padding: 'clamp(20px,4vw,30px)' }}>

              {/* Multi-step tab indicators */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => setFormTab(1)}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 'var(--r-sm)',
                    background: formTab === 1 ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${formTab === 1 ? 'var(--cyan)' : 'var(--border-subtle)'}`,
                    color: formTab === 1 ? 'var(--cyan)' : 'var(--text-muted)',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  1. Account Info
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab(2)}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 'var(--r-sm)',
                    background: formTab === 2 ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${formTab === 2 ? 'var(--purple)' : 'var(--border-subtle)'}`,
                    color: formTab === 2 ? 'var(--purple)' : 'var(--text-muted)',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  2. Organization & Details
                </button>
              </div>

              {error && (
                <div className="anim-fadeDown" style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '12px 14px', borderRadius: 'var(--r-md)',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
                  color: '#FCA5A5', fontSize: '13px', marginBottom: '20px',
                }}>
                  <AlertIcon />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {formTab === 1 && (
                  <div className="anim-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Full Name</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
                          <UserIcon />
                        </span>
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          className="input-field"
                          style={{ paddingLeft: '40px' }}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Username</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
                          <UserIcon />
                        </span>
                        <input
                          type="text"
                          placeholder="Choose username"
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          className="input-field"
                          style={{ paddingLeft: '40px' }}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Email Address</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
                          <MailIcon />
                        </span>
                        <input
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="input-field"
                          style={{ paddingLeft: '40px' }}
                          required
                          readOnly={isGoogleMode}
                        />
                      </div>
                    </div>

                    {!isGoogleMode && (
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
                            <LockIcon />
                          </span>
                          <input
                            type={showPass ? 'text' : 'password'}
                            placeholder="Create security key"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="input-field"
                            style={{ paddingLeft: '40px', paddingRight: '44px' }}
                            required={!isGoogleMode}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(v => !v)}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px', borderRadius: '6px', transition: 'color 0.2s' }}
                          >
                            <EyeIcon open={showPass} />
                          </button>
                        </div>

                        {password && (
                          <div className="anim-fadeUp" style={{ marginTop: '8px' }}>
                            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                              {[1, 2, 3, 4].map(idx => (
                                <div key={idx} style={{
                                  flex: 1, height: '3px', borderRadius: '2px',
                                  background: idx <= strength.score ? strength.color : 'var(--text-faint)',
                                  transition: 'background 0.3s ease',
                                }} />
                              ))}
                            </div>
                            <span style={{ fontSize: '11px', color: strength.color, fontWeight: '700' }}>{strength.label}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setFormTab(2)}
                      style={{ marginTop: '8px', justifyContent: 'center' }}
                    >
                      Next: Profile Details →
                    </button>
                  </div>
                )}

                {formTab === 2 && (
                  <div className="anim-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Phone Number</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
                          <PhoneIcon />
                        </span>
                        <input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          className="input-field"
                          style={{ paddingLeft: '40px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Organization</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
                            <BuildingIcon />
                          </span>
                          <input
                            type="text"
                            placeholder="Company / Univ"
                            value={organization}
                            onChange={e => setOrganization(e.target.value)}
                            className="input-field"
                            style={{ paddingLeft: '40px' }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Job Title</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
                            <BriefcaseIcon />
                          </span>
                          <input
                            type="text"
                            placeholder="GIS Analyst"
                            value={jobTitle}
                            onChange={e => setJobTitle(e.target.value)}
                            className="input-field"
                            style={{ paddingLeft: '40px' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Location / Region</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
                          <MapPinIcon />
                        </span>
                        <input
                          type="text"
                          placeholder="San Francisco, CA"
                          value={userLocation}
                          onChange={e => setUserLocation(e.target.value)}
                          className="input-field"
                          style={{ paddingLeft: '40px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Short Bio</label>
                      <textarea
                        rows="2"
                        placeholder="Brief summary of your geospatial focus..."
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        className="input-field"
                        style={{ resize: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setFormTab(1)}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        ← Back
                      </button>
                      <button
                        ref={btnRef}
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        onClick={handleRipple}
                        style={{ flex: 2, padding: '13px', fontSize: '14px' }}
                      >
                        {loading ? <><LoadSpinner /> Submitting…</> : <><UserPlusIcon /> Complete Sign-Up</>}
                      </button>
                    </div>
                  </div>
                )}

              </form>

              {!isGoogleMode && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
                    <span style={{ padding: '0 12px', fontSize: '12px', color: 'var(--text-muted)' }}>or</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <GoogleLogin
                      theme="dark"
                      shape="rectangular"
                      width="328"
                      onSuccess={handleGoogleSuccess}
                      onError={() => setError('Google Authentication failed')}
                      useOneTap
                    />
                  </div>
                </>
              )}

            </div>
          </div>

          <p style={{
            textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)',
            ...tf, opacity: step >= 3 ? 1 : 0, transform: step >= 3 ? 'none' : 'translateY(12px)',
          }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--cyan)', fontWeight: '700', textDecoration: 'none' }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 639px) {
          .form-container { width: 100% !important; }
          .show-mobile { display: flex !important; }
        }
        @media (min-width: 640px) {
          .show-mobile { display: none !important; }
          .hide-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  );
}