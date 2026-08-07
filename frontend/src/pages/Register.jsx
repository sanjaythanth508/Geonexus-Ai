import { useState, useEffect, useRef, useCallback } from 'react';
import { register, loginWithGoogle, sendOTP, verifyOTP } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import Layout from '../components/Common/Layout';

/* ── Icons ── */
const UserIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const MailIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const LockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const EyeIcon  = ({ open }) => open
  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const UserPlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
const AlertIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

function LoadSpinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        style={{ animation: 'spin 0.75s linear infinite', transformOrigin: 'center' }}/>
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
    { label: 'Weak password', color: 'var(--c-error)' },
    { label: 'Fair security', color: 'var(--c-warning)' },
    { label: 'Good configuration', color: 'var(--c-warning)' },
    { label: 'Highly secure key', color: 'var(--c-success)' },
  ];
  return { score, ...map[score] };
}

export default function Register() {
  const location = useLocation();
  const initialGoogleInfo = location.state?.googleInfo || null;

  const [username, setUsername] = useState(initialGoogleInfo?.email || '');
  const [fullName, setFullName] = useState(initialGoogleInfo?.full_name || '');
  const [email, setEmail] = useState(initialGoogleInfo?.email || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [organization] = useState('');
  const [jobTitle] = useState('');
  const [userLocation] = useState('');
  const [bio] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [step, setStep] = useState(0);

  // OTP Verification States
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState({ type: '', text: '' });
  const [emailForOtp, setEmailForOtp] = useState('');

  // Field Validation States
  const [validationErrors, setValidationErrors] = useState({});

  const { loginWithTokens } = useAuth();
  const navigate = useNavigate();
  const btnRef = useRef(null);

  const isGoogleMode = !!initialGoogleInfo;
  const strength = getStrength(password);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 80);
    const t2 = setTimeout(() => setStep(2), 240);
    const t3 = setTimeout(() => setStep(3), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const validateField = (name, value) => {
    let errs = { ...validationErrors };
    if (name === 'fullName') {
      if (!value) errs.fullName = 'Full Name is required';
      else if (value.length < 2) errs.fullName = 'Full Name must be at least 2 characters';
      else if (!/^[a-zA-Z\s\-\']+$/.test(value)) errs.fullName = 'Letters, spaces, hyphens and apostrophes only';
      else delete errs.fullName;
    }
    if (name === 'username') {
      if (!value) errs.username = 'Username is required';
      else if (value.length < 3) errs.username = 'Username must be at least 3 characters';
      else if (!/^[a-zA-Z0-9_\-]+$/.test(value)) errs.username = 'Alphanumeric, underscores and hyphens only';
      else delete errs.username;
    }
    if (name === 'email') {
      if (!value) errs.email = 'Email is required';
      else if (!/^[\w\.\+\-]+\@[\w\.\-]+\.[\w]{2,}$/.test(value)) errs.email = 'Invalid email format';
      else delete errs.email;
    }
    if (name === 'password') {
      if (!value) errs.password = 'Password is required';
      else if (value.length < 8) errs.password = 'Must be at least 8 characters';
      else if (!/[A-Z]/.test(value)) errs.password = 'Must contain an uppercase letter';
      else if (!/[0-9]/.test(value)) errs.password = 'Must contain a digit';
      else if (!/[^A-Za-z0-9]/.test(value)) errs.password = 'Must contain a special character';
      else delete errs.password;
    }
    if (name === 'phone') {
      if (value && !/^\+?[0-9\s\-()]{7,20}$/.test(value)) errs.phone = 'Invalid phone format';
      else delete errs.phone;
    }
    setValidationErrors(errs);
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    validateField('email', val);
    if (val !== emailForOtp) {
      setOtpSent(false);
      setOtpVerified(false);
      setOtpCode('');
      setOtpMessage({ type: '', text: '' });
    }
  };

  const handleSendOTP = async () => {
    if (!email) {
      setOtpMessage({ type: 'error', text: 'Email is required' });
      return;
    }
    if (validationErrors.email) {
      setOtpMessage({ type: 'error', text: validationErrors.email });
      return;
    }
    setOtpLoading(true);
    setOtpMessage({ type: '', text: '' });
    try {
      await sendOTP(email);
      setOtpSent(true);
      setEmailForOtp(email);
      setOtpMessage({ type: 'success', text: 'Verification code sent to your email.' });
    } catch (err) {
      setOtpMessage({ type: 'error', text: err.response?.data?.error || 'Failed to send verification code.' });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setOtpMessage({ type: 'error', text: 'Please enter a 6-digit code.' });
      return;
    }
    setOtpLoading(true);
    setOtpMessage({ type: '', text: '' });
    try {
      await verifyOTP(email, otpCode);
      setOtpVerified(true);
      setOtpMessage({ type: 'success', text: 'Email verified successfully!' });
    } catch (err) {
      setOtpMessage({ type: 'error', text: err.response?.data?.error || 'Invalid or expired code.' });
    } finally {
      setOtpLoading(false);
    }
  };

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

    // Run validations
    validateField('fullName', fullName);
    validateField('username', username);
    validateField('email', email);
    if (!isGoogleMode) validateField('password', password);
    validateField('phone', phone);

    const hasErrors = !fullName || !username || !email || (!isGoogleMode && !password) ||
      validationErrors.fullName || validationErrors.username || validationErrors.email ||
      (!isGoogleMode && validationErrors.password) || validationErrors.phone;

    if (hasErrors) {
      setError('Please correct all validation errors before submitting.');
      setShakeKey(k => k + 1);
      return;
    }

    if (!isGoogleMode && !otpVerified) {
      setError('Please send and verify the code sent to your email.');
      setShakeKey(k => k + 1);
      return;
    }

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
        navigate('/home');
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
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Google Authentication failed.');
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
              <circle cx="24" cy="24" r="20" stroke="var(--c-green-700)" strokeWidth="2.5"/>
              <ellipse cx="24" cy="24" rx="9" ry="20" stroke="var(--c-green-700)" strokeWidth="2"/>
              <line x1="4" y1="24" x2="44" y2="24" stroke="var(--c-green-700)" strokeWidth="2"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: '800', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '16px' }}>
            <span className="gradient-text">{isGoogleMode ? 'Verify Details' : 'Join GeoNexus'}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.75 }}>
            {isGoogleMode 
              ? 'Complete registration with your prefilled Google details to activate your account.' 
              : 'Create an account to run MCDA suitability algorithms and deploy industrial analysis nodes.'
            }
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '32px' }}>
            {[' Secure Storage', '️ Satellite Views', ' Instant Processing', ' Scale Analytics'].map(f => (
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
          <div style={{ marginBottom: '24px', ...tf, opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? 'none' : 'translateY(12px)' }} className="text-center md:text-left">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '6px' }}>
              {isGoogleMode ? 'Complete Sign-Up' : 'Create Account'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              {isGoogleMode ? 'Review your imported profile information' : 'Register via secure email verification'}
            </p>
          </div>

          <div
            key={shakeKey}
            className={`form-card ${error && shakeKey ? 'anim-shake' : ''}`}
            style={{
              ...tf,
              opacity: step >= 2 ? 1 : 0,
              transform: step >= 2 ? 'none' : 'translateY(16px)',
              padding: '28px clamp(16px, 5vw, 32px)',
              maxWidth: '440px'
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

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <div className="form-input-wrapper" style={{ flex: 1 }}>
                    <span className="form-input-icon">
                      <MailIcon />
                    </span>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={handleEmailChange}
                      className="form-input-field"
                      required
                      readOnly={isGoogleMode || otpVerified}
                    />
                  </div>
                  {!isGoogleMode && !otpVerified && (
                    <button
                      type="button"
                      disabled={otpLoading || !email || !!validationErrors.email}
                      onClick={handleSendOTP}
                      className="btn-ghost"
                      style={{ fontSize: '12px', whiteSpace: 'nowrap', padding: '0 16px', borderRadius: 'var(--r-md)' }}
                    >
                      {otpLoading ? 'Sending...' : otpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  )}
                </div>
                {validationErrors.email && (
                  <span style={{ fontSize: '11px', color: 'var(--c-error)', marginTop: '2px', display: 'block' }}>{validationErrors.email}</span>
                )}

                {!isGoogleMode && otpSent && !otpVerified && (
                  <div className="anim-fadeDown" style={{
                    padding: '12px', borderRadius: 'var(--r-md)',
                    background: 'var(--c-surface-hover)', border: '1px solid var(--border-subtle)',
                    marginTop: '8px'
                  }}>
                    <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Verification Code</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        maxLength="6"
                        placeholder="000000"
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="form-input-field"
                        style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '16px', fontWeight: '800', flex: 1, paddingLeft: '16px' }}
                      />
                      <button
                        type="button"
                        disabled={otpLoading || otpCode.length !== 6}
                        onClick={handleVerifyOTP}
                        className="btn-primary"
                        style={{ padding: '0 20px', borderRadius: 'var(--r-md)', fontSize: '12px' }}
                      >
                        {otpLoading ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                  </div>
                )}

                {otpMessage.text && (
                  <span style={{
                    fontSize: '12px',
                    color: otpMessage.type === 'success' ? 'var(--c-success)' : 'var(--c-error)',
                    marginTop: '4px',
                    fontWeight: '600',
                    display: 'block'
                  }}>
                    {otpMessage.type === 'success' ? ' ' : ' '}{otpMessage.text}
                  </span>
                )}
              </div>

              {(isGoogleMode || otpVerified) && (
                <div className="anim-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon">
                        <UserIcon />
                      </span>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={e => { setFullName(e.target.value); validateField('fullName', e.target.value); }}
                        className="form-input-field"
                        required
                      />
                    </div>
                    {validationErrors.fullName && (
                      <span style={{ fontSize: '11px', color: 'var(--c-error)', marginTop: '2px', display: 'block' }}>{validationErrors.fullName}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon">
                        <UserIcon />
                      </span>
                      <input
                        type="text"
                        placeholder="operator_name"
                        value={username}
                        onChange={e => { setUsername(e.target.value); validateField('username', e.target.value); }}
                        className="form-input-field"
                        required
                      />
                    </div>
                    {validationErrors.username && (
                      <span style={{ fontSize: '11px', color: 'var(--c-error)', marginTop: '2px', display: 'block' }}>{validationErrors.username}</span>
                    )}
                  </div>

                  {!isGoogleMode && (
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <div className="form-input-wrapper">
                        <span className="form-input-icon">
                          <LockIcon />
                        </span>
                        <input
                          type={showPass ? 'text' : 'password'}
                          placeholder="Security password key"
                          value={password}
                          onChange={e => { setPassword(e.target.value); validateField('password', e.target.value); }}
                          className="form-input-field"
                          style={{ paddingRight: '44px' }}
                          required={!isGoogleMode}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(v => !v)}
                          className="form-password-toggle"
                        >
                          <EyeIcon open={showPass} />
                        </button>
                      </div>
                      {validationErrors.password && (
                        <span style={{ fontSize: '11px', color: 'var(--c-error)', marginTop: '2px', display: 'block' }}>{validationErrors.password}</span>
                      )}

                      {password && (
                        <div className="anim-fadeUp" style={{ marginTop: '6px' }}>
                          <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                            {[1, 2, 3, 4].map(idx => (
                              <div key={idx} style={{
                                flex: 1, height: '3px', borderRadius: '2px',
                                background: idx <= strength.score ? strength.color : 'var(--text-faint)',
                                transition: 'background 0.3s ease',
                              }} />
                            ))}
                          </div>
                          <span style={{ fontSize: '11px', color: strength.color, fontWeight: '750' }}>{strength.label}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    ref={btnRef}
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    onClick={handleRipple}
                    style={{ padding: '14px', fontSize: '14px', width: '100%', marginTop: '6px' }}
                  >
                    {loading ? <><LoadSpinner /> Syncing…</> : <><UserPlusIcon /> Complete Registration</>}
                  </button>
                </div>
              )}
            </form>

            {!isGoogleMode && (
              <>
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
              </>
            )}
          </div>

          <p style={{
            textAlign: 'center', marginTop: '24px', fontSize: '13.5px', color: 'var(--text-muted)',
            ...tf, opacity: step >= 3 ? 1 : 0, transform: step >= 3 ? 'none' : 'translateY(12px)',
          }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--c-primary-600)', fontWeight: '700', textDecoration: 'none' }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}