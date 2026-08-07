import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendResetOtp, verifyOTP, resetPassword } from '../api/auth';
import Layout from '../components/Common/Layout';

/* ── Icons ── */
const MailIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const LockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const EyeIcon  = ({ open }) => open
  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const AlertIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const CheckCircleIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--c-success)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>;

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

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [step, setStep] = useState(1); // 1 = Email, 2 = OTP, 3 = New Password
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const btnRef = useRef(null);

  const strength = getStrength(newPassword);

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

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required");
      setShakeKey(k => k + 1);
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await sendResetOtp(email);
      setSuccess("Reset code sent! Check your email inbox.");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reset code. Make sure email is registered.");
      setShakeKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpCode) {
      setError("Verification code is required");
      setShakeKey(k => k + 1);
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await verifyOTP(email, otpCode);
      setSuccess("Code verified successfully!");
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid or expired verification code.");
      setShakeKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      setShakeKey(k => k + 1);
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await resetPassword(email, otpCode, newPassword);
      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password.");
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        width: '100vw',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '420px', width: '100%' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: '800', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '16px' }}>
            <span className="gradient-text">Reset Password</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14.5px', lineHeight: 1.6, marginBottom: '32px' }}>
            {step === 1 && "Enter your email address to receive a secure password reset code."}
            {step === 2 && "Enter the 6-digit verification code sent to your email."}
            {step === 3 && "Create a secure new password for your operator account."}
          </p>

          <div
            key={shakeKey}
            className={`form-card ${error && shakeKey ? 'anim-shake' : ''}`}
            style={{
              padding: '28px clamp(16px, 5vw, 32px)',
              margin: '0 auto',
            }}
          >
            {error && (
              <div className="anim-fadeDown" style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '12px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--c-surface)', border: '1px solid rgba(239,68,68,0.22)',
                color: 'var(--c-error)', fontSize: '13px', marginBottom: '20px',
              }}>
                <AlertIcon />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="anim-fadeDown" style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '12px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--c-surface)', border: '1px solid rgba(16,185,129,0.22)',
                color: '#A7F3D0', fontSize: '13px', marginBottom: '20px',
              }}>
                <CheckCircleIcon />
                <span>{success}</span>
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon">
                      <MailIcon />
                    </span>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="form-input-field"
                      required
                    />
                  </div>
                </div>

                <button
                  ref={btnRef}
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  onClick={handleRipple}
                  style={{ width: '100%', padding: '14px', fontSize: '14px' }}
                >
                  {loading ? <><LoadSpinner /> Sending…</> : 'Send Reset Code'}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="form-group">
                  <label className="form-label">Enter 6-Digit Code</label>
                  <input
                    type="text"
                    maxLength="6"
                    placeholder="000000"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="form-input-field"
                    style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '18px', fontWeight: '800', paddingLeft: '16px' }}
                    required
                  />
                </div>

                <button
                  ref={btnRef}
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="btn-primary"
                  onClick={handleRipple}
                  style={{ width: '100%', padding: '14px', fontSize: '14px' }}
                >
                  {loading ? <><LoadSpinner /> Verifying…</> : 'Verify Reset Code'}
                </button>
                
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-ghost"
                  style={{ width: '100%', padding: '12px', fontSize: '13px' }}
                >
                  ← Back to Email
                </button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon">
                      <LockIcon />
                    </span>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="form-input-field"
                      style={{ paddingRight: '44px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="form-password-toggle"
                    >
                      <EyeIcon open={showPass} />
                    </button>
                  </div>

                  {newPassword && (
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

                <button
                  ref={btnRef}
                  type="submit"
                  disabled={loading || newPassword.length < 8}
                  className="btn-primary"
                  onClick={handleRipple}
                  style={{ width: '100%', padding: '14px', fontSize: '14px' }}
                >
                  {loading ? <><LoadSpinner /> Resetting…</> : 'Reset Password'}
                </button>
              </form>
            )}
          </div>

          <p style={{
            textAlign: 'center', marginTop: '24px', fontSize: '13.5px', color: 'var(--text-muted)',
            ...tf, opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? 'none' : 'translateY(12px)',
          }}>
            Remember your credentials?{' '}
            <Link to="/login" style={{ color: 'var(--cyan)', fontWeight: '700', textDecoration: 'none' }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
