import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendResetOtp, verifyOTP, resetPassword } from '../api/auth';

/* ═══════════════════════════════════════════════
   ICONS
═══════════════════════════════════════════════ */
const MailIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const LockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const EyeIcon  = ({open}) => open
  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const CheckCircleIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>;
const AlertIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

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
      position:'absolute', left:`${x}px`, top:`${y}px`,
      width:'6px', height:'6px', marginLeft:'-3px', marginTop:'-3px',
      background:'rgba(255,255,255,0.5)', borderRadius:'50%',
      animation:'ripple 0.7s ease-out forwards', pointerEvents:'none',
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
      setSuccess("Reset code sent! Check your email.");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reset code. Make sure the email is registered.");
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
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password.");
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
      <Orbs />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px clamp(20px, 5vw, 60px)',
        position: 'relative',
        zIndex: 2,
      }}>
        <OrbitRings />
        <div style={{ textAlign: 'center', maxWidth: '420px', position: 'relative', zIndex: 1, width: '100%' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: '800', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '16px' }}>
            <span className="gradient-text">Reset Password</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>
            {step === 1 && "Enter your email address to receive a secure password reset code."}
            {step === 2 && "Enter the 6-digit verification code sent to your email."}
            {step === 3 && "Create a new strong password for your account."}
          </p>

          <div
            key={shakeKey}
            className={`glass-bright ${error && shakeKey ? 'anim-shake' : ''}`}
            style={{
              borderRadius: 'var(--r-xl)',
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07)',
              textAlign: 'left'
            }}
          >
            <div style={{
              height: '3px',
              background: 'linear-gradient(90deg, #22D3EE, #3B82F6, #8B5CF6, #22D3EE)',
              backgroundSize: '300% 100%',
              animation: 'gradient-flow 4s ease infinite',
            }} />

            <div style={{ padding: 'clamp(24px,5vw,36px)' }}>
              
              {/* Progress Bar */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= 1 ? 'var(--cyan)' : 'rgba(255,255,255,0.1)' }} />
                <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= 2 ? 'var(--cyan)' : 'rgba(255,255,255,0.1)' }} />
                <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= 3 ? 'var(--cyan)' : 'rgba(255,255,255,0.1)' }} />
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

              {success && (
                <div className="anim-fadeDown" style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '12px 14px', borderRadius: 'var(--r-md)',
                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)',
                  color: '#6EE7B7', fontSize: '13px', marginBottom: '20px',
                }}>
                  <CheckCircleIcon />
                  <span>{success}</span>
                </div>
              )}

              {step === 1 && (
                <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="anim-fadeIn">
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Registered Email</label>
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
                      />
                    </div>
                  </div>
                  <button ref={btnRef} type="submit" disabled={loading} className="btn-primary" onClick={handleRipple} style={{ width: '100%', padding: '15px', fontSize: '15px', marginTop: '4px' }}>
                    {loading ? <><LoadSpinner /> Sending...</> : 'Send Reset Code'}
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="anim-fadeIn">
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>6-Digit OTP Code</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="000000"
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="input-field"
                        style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px', fontWeight: '800' }}
                        required
                        maxLength={6}
                      />
                    </div>
                  </div>
                  <button ref={btnRef} type="submit" disabled={loading} className="btn-primary" onClick={handleRipple} style={{ width: '100%', padding: '15px', fontSize: '15px', marginTop: '4px' }}>
                    {loading ? <><LoadSpinner /> Verifying...</> : 'Verify Code'}
                  </button>
                  <button type="button" onClick={handleSendOTP} disabled={loading} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', marginTop: '8px', fontWeight: '600', transition: 'color 0.2s' }} onMouseEnter={e=>e.currentTarget.style.color='var(--cyan)'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>
                    Resend Code
                  </button>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="anim-fadeIn">
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
                        <LockIcon />
                      </span>
                      <input
                        type={showPass ? 'text' : 'password'}
                        placeholder="Minimum 8 characters"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="input-field"
                        style={{ paddingLeft: '40px', paddingRight: '44px' }}
                        required
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px', borderRadius: '6px', transition: 'color 0.2s' }}>
                        <EyeIcon open={showPass} />
                      </button>
                    </div>
                    {/* Password Strength Indicator */}
                    {newPassword && (
                      <div className="anim-fadeIn" style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '6px' }}>
                          {[1,2,3,4].map(s => (
                            <div key={s} style={{ flex: 1, borderRadius: '2px', background: s <= strength.score ? strength.color : 'rgba(255,255,255,0.05)', transition: 'all 0.3s' }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '600' }}>
                          <span style={{ color: strength.score > 0 ? strength.color : 'var(--text-muted)' }}>{strength.label || 'Enter password'}</span>
                          <span style={{ color: strength.score >= 3 ? '#10B981' : 'var(--text-muted)' }}>{strength.score}/4</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <button ref={btnRef} type="submit" disabled={loading} className="btn-primary" onClick={handleRipple} style={{ width: '100%', padding: '15px', fontSize: '15px', marginTop: '4px' }}>
                    {loading ? <><LoadSpinner /> Resetting...</> : 'Reset Password'}
                  </button>
                </form>
              )}

            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Remembered your password?{' '}
            <Link to="/login" style={{ color: 'var(--cyan)', fontWeight: '700', textDecoration: 'none' }}>
              Sign In →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
