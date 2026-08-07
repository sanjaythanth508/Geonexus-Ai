import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { loginWithGoogle } from '../api/auth';
import Layout from '../components/Common/Layout';

/* ── Icons ── */
const UserIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const LockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const EyeIcon  = ({ open }) => open
  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const SignInIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>;
const AlertIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

function LoadSpinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        style={{ animation: 'spin 0.75s linear infinite', transformOrigin: 'center' }}/>
    </svg>
  );
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [step, setStep] = useState(0);
  const { loginUser, loginWithTokens } = useAuth();
  const navigate = useNavigate();
  const btnRef = useRef(null);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 80);
    const t2 = setTimeout(() => setStep(2), 240);
    const t3 = setTimeout(() => setStep(3), 400);
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
      position: 'absolute', left: `${x}px`, top: `${y}px`,
      width: '6px', height: '6px', marginLeft: '-3px', marginTop: '-3px',
      background: 'var(--text-muted)', borderRadius: '50%',
      animation: 'ripple 0.7s ease-out forwards', pointerEvents: 'none',
    });
    btn.appendChild(rEl);
    setTimeout(() => rEl.remove(), 700);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await loginUser(username, password);
      navigate('/home');
    } catch {
      setError('Invalid username or password. Please try again.');
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
        navigate('/register', { state: { googleInfo: data.google_info } });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Google authentication failed.');
      setShakeKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const tf = { transition: 'opacity 0.5s var(--ease-out), transform 0.5s var(--ease-out)' };

  return (
    <Layout authTheme={true}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '60px',
        padding: '24px',
        maxWidth: '1000px',
        width: '100%',
      }} className="flex-col md:flex-row">
        {/* Info Column */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '380px',
          ...tf,
          opacity: step >= 1 ? 1 : 0,
          transform: step >= 1 ? 'none' : 'translateY(16px)',
        }} className="hidden md:flex">
          <div style={{
            width: '80px', height: '80px', borderRadius: '24px',
            background: 'var(--c-primary-50)',
            border: '1px solid var(--c-primary-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-md)',
          }}>
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="url(#heroGl)" strokeWidth="2.5"/>
              <ellipse cx="24" cy="24" rx="9" ry="20" stroke="url(#heroGl)" strokeWidth="2"/>
              <line x1="4" y1="24" x2="44" y2="24" stroke="url(#heroGl)" strokeWidth="2"/>
              <defs>
                <linearGradient id="heroGl" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--c-primary-500)"/><stop offset="100%" stopColor="var(--c-primary-700)"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: '800', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '16px' }}>
            <span className="gradient-text">GeoNexus AI</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.75 }}>
            Advanced geospatial intelligence platform for real-time suitability analysis, mapping, and regulatory compliance in Gujarat.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '32px' }}>
            {['️ GIDC Proximities', ' MCDA Siting Scoring', ' GeoChat AI Guidance', ' Spatial Analytics'].map(f => (
              <div key={f} style={{
                padding: '6px 14px', borderRadius: 'var(--r-full)',
                background: 'var(--c-surface)', border: '1px solid var(--border-subtle)',
                fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600',
                boxShadow: 'var(--shadow-xs)'
              }}>{f}</div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: '1px',
          background: 'linear-gradient(to bottom, transparent, var(--border-subtle) 20%, var(--border-subtle) 80%, transparent)',
          alignSelf: 'stretch',
        }} className="hidden md:block"/>

        {/* Form Column */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '440px',
        }}>
          {/* Mobile brand logo */}
          <div style={{
            flexDirection: 'column', alignItems: 'center',
            marginBottom: '24px', textAlign: 'center',
            ...tf,
            opacity: step >= 1 ? 1 : 0,
            transform: step >= 1 ? 'none' : 'translateY(12px)',
          }} className="flex md:hidden">
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'var(--c-primary-50)',
              border: '1px solid var(--c-primary-200)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '12px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="url(#mobGl)" strokeWidth="2.5"/>
                <ellipse cx="24" cy="24" rx="9" ry="20" stroke="url(#mobGl)" strokeWidth="2"/>
                <defs><linearGradient id="mobGl" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="var(--c-primary-500)"/><stop offset="100%" stopColor="var(--c-primary-700)"/></linearGradient></defs>
              </svg>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.03em' }}>
              <span className="gradient-text">GeoNexus AI</span>
            </h1>
          </div>

          <div style={{ marginBottom: '24px', ...tf, opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? 'none' : 'translateY(12px)' }} className="text-center md:text-left">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '6px' }}>
              Welcome back
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Sign in to your account</p>
          </div>

          <div
            key={shakeKey}
            className={`form-card ${error && shakeKey ? 'anim-shake' : ''}`}
            style={{
              ...tf,
              opacity: step >= 2 ? 1 : 0,
              transform: step >= 2 ? 'none' : 'translateY(16px)',
              padding: '28px clamp(16px, 5vw, 32px)'
            }}
          >
            {error && (
              <div className="anim-fadeDown" style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '12px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--c-error-light)', border: '1px solid var(--c-error)',
                color: 'var(--text-primary)', fontSize: '13px', marginBottom: '20px',
              }}>
                <AlertIcon />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group">
                <label className="form-label">Username or Email</label>
                <div className="form-input-wrapper">
                  <span className="form-input-icon">
                    <UserIcon />
                  </span>
                  <input
                    type="text"
                    placeholder="Your username or email"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="form-input-field"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Password</label>
                  <Link to="/forgot-password" style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--c-primary-600)', textDecoration: 'none' }}>
                    Forgot Password?
                  </Link>
                </div>
                <div className="form-input-wrapper">
                  <span className="form-input-icon">
                    <LockIcon />
                  </span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="form-input-field"
                    style={{ paddingRight: '44px' }}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="form-password-toggle"
                  >
                    <EyeIcon open={showPass} />
                  </button>
                </div>
              </div>

              <button
                ref={btnRef}
                type="submit"
                disabled={loading}
                className="btn-primary"
                onClick={handleRipple}
                style={{ width: '100%', padding: '14px', fontSize: '14px', marginTop: '6px' }}
              >
                {loading ? <><LoadSpinner /> Signing in…</> : <><SignInIcon /> Sign In</>}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}/>
              <span style={{ padding: '0 12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}/>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <GoogleLogin
                theme="outline"
                shape="rectangular"
                width="100%"
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Sign-In failed')}
                useOneTap
              />
            </div>
          </div>

          <p style={{
            textAlign: 'center', marginTop: '24px', fontSize: '13.5px', color: 'var(--text-muted)',
            ...tf, opacity: step >= 3 ? 1 : 0, transform: step >= 3 ? 'none' : 'translateY(12px)',
          }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--c-primary-600)', fontWeight: '700', textDecoration: 'none' }}>
              Create one →
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}