import { useState, useEffect, useRef, useCallback } from 'react';
import { register, loginWithGoogle } from '../api/auth';
import { useNavigate, Link } from 'react-router-dom';
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
   ICON COMPONENTS
   ═══════════════════════════════════════════════ */
const UserIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const MailIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const LockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const EyeIcon  = ({open}) => open
  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const UserPlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
const AlertIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

function LoadSpinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        style={{ animation: 'spin 0.75s linear infinite', transformOrigin:'center' }}/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   PASSWORD STRENGTH METER
   ═══════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════
   FLOATING ORB DECORATIONS
   ═══════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════
   ORBIT RINGS
   ═══════════════════════════════════════════════ */
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
  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [step,     setStep]     = useState(0); 
  const navigate = useNavigate();
  const btnRef = useRef(null);

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
    try {
      await register(username, password, email);
      navigate('/login');
    } catch {
      setError('Registration failed. Username or email may already be registered.');
      setShakeKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');
    try {
      const data = await loginWithGoogle(credentialResponse.credential);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Google Registration failed.');
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
        <div style={{ textAlign: 'center', maxWidth: '380px', position: 'relative', zIndex: 1 }}>
          <div className="anim-floatSlow" style={{ marginBottom: '32px', animation: 'float 6s ease-in-out infinite' }}>
            <GlobeIcon size={100} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: '800', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '16px' }}>
            <span className="gradient-text">Join GeoNexus AI</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1.75 }}>
            Create an account to deploy geospatial insights, store custom analysis markers, and generate interactive intelligence maps.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '32px' }}>
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
        width: 'clamp(320px, 45%, 520px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(24px, 5vw, 60px) clamp(20px, 5vw, 60px)',
        position: 'relative',
        zIndex: 2,
        flexShrink: 0,
      }}
      className="form-container"
      >
        <div style={{ width: '100%', maxWidth: '400px' }}>

          <div className="show-mobile" style={{
            display: 'none', flexDirection: 'column', alignItems: 'center',
            marginBottom: '32px', textAlign: 'center',
            ...tf,
            opacity: step >= 1 ? 1 : 0,
            transform: step >= 1 ? 'none' : 'translateY(16px)',
          }}>
            <div style={{ marginBottom: '12px' }}><GlobeIcon size={56} /></div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.03em' }}>
              <span className="gradient-text">GeoNexus AI</span>
            </h1>
          </div>

          <div style={{ marginBottom: '30px', ...tf, opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? 'none' : 'translateY(20px)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,30px)', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '8px' }}>
              Create Account 🛰️
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Register to access the visualization suite</p>
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

            <div style={{ padding: 'clamp(24px,5vw,36px)' }}>

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

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

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
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Email <span style={{ color: 'var(--text-muted)', textTransform: 'none', fontWeight: 'normal' }}>(optional)</span></label>
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
                      autoComplete="email"
                    />
                  </div>
                </div>

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
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px', borderRadius: '6px', transition: 'color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
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

                <button
                  ref={btnRef}
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  onClick={handleRipple}
                  style={{ width: '100%', padding: '15px', fontSize: '15px', marginTop: '6px' }}
                >
                  {loading ? <><LoadSpinner /> Registering…</> : <><UserPlusIcon /> Sign Up</>}
                </button>
              </form>

              {/* Decorative Divider */}
              <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
                <span style={{ padding: '0 12px', fontSize: '12px', color: 'var(--text-muted)' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
              </div>

              {/* Centralized Glassmorphic Google Container */}
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

            </div>
          </div>

          <p style={{
            textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)',
            ...tf, opacity: step >= 3 ? 1 : 0, transform: step >= 3 ? 'none' : 'translateY(12px)',
          }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--cyan)', fontWeight: '700', textDecoration: 'none', transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
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