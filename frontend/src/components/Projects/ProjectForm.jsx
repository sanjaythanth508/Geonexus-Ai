import { useState, useEffect, useRef } from 'react';
import api from '../../api/client';

/* ── Custom World-Class Notification/Toast ── */
function SuccessToast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="anim-bounceIn" style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 10000,
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 20px',
      background: 'rgba(10, 14, 26, 0.90)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(16, 185, 129, 0.35)',
      borderRadius: 'var(--r-md)',
      color: '#A7F3D0',
      fontSize: '13.5px',
      fontWeight: '600',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 20px rgba(16,185,129,0.15)',
    }}>
      <div style={{
        width: '24px', height: '24px', borderRadius: '50%',
        background: 'rgba(16, 185, 129, 0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <span>{message}</span>
    </div>
  );
}

function AlertToast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="anim-bounceIn" style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 10000,
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 20px',
      background: 'rgba(10, 14, 26, 0.90)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(239, 68, 68, 0.35)',
      borderRadius: 'var(--r-md)',
      color: '#FECACA',
      fontSize: '13.5px',
      fontWeight: '600',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 20px rgba(239,68,68,0.15)',
    }}>
      <div style={{
        width: '24px', height: '24px', borderRadius: '50%',
        background: 'rgba(239, 68, 68, 0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
      <span>{message}</span>
    </div>
  );
}

/* ── Spinner Icon ── */
function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        style={{ animation: 'spin 0.8s linear infinite', transformOrigin: 'center' }}/>
    </svg>
  );
}

export default function ProjectForm({ onProjectCreated, selectedLocation, analysisResult }) {
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading]         = useState(false);
  const [toast, setToast]             = useState(null);
  const [errToast, setErrToast]       = useState(null);
  const nameRef = useRef(null);

  // Pre-fill fields when analysisResult or selectedLocation changes
  useEffect(() => {
    if (analysisResult) {
      const dist = analysisResult.district || 'Gujarat';
      const ind = analysisResult.industry_type || 'Industrial';
      setName(`${dist} ${ind} Node`);
      setDescription('');
    } else if (selectedLocation) {
      setName(`Site Node (${selectedLocation.lat.toFixed(3)}, ${selectedLocation.lon.toFixed(3)})`);
      setDescription('');
    } else {
      setName('');
      setDescription('');
    }
  }, [analysisResult, selectedLocation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formattedName = name.trim();
    if (!formattedName) return;

    setLoading(true);
    try {
      const payload = {
        name: formattedName,
        description: description.trim(),
        analysis_data: analysisResult || null,
      };
      if (selectedLocation) {
        payload.latitude = selectedLocation.lat;
        payload.longitude = selectedLocation.lon;
      }
      await api.post('projects/', payload);
      setName('');
      setDescription('');
      setToast(`Project node "${formattedName}" deployed!`);
      onProjectCreated();
    } catch {
      setErrToast("Server error. Failed to deploy project node.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Name Input */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </span>
          <input
            ref={nameRef}
            type="text"
            placeholder="Asset / Project node label…"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '38px', paddingRight: '12px', fontSize: '13px' }}
            required
            maxLength={100}
          />
        </div>

        {/* Description Textarea */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
          </span>
          <textarea
            placeholder="Add descriptive identifiers (optional)…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '38px', paddingTop: '10px', fontSize: '13px', minHeight: '64px', maxHeight: '150px', resize: 'vertical' }}
            rows={2}
            maxLength={300}
          />
        </div>

        {/* Submit Action */}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '11px',
            borderRadius: 'var(--r-md)',
            background: name.trim() ? 'var(--grad-btn)' : 'rgba(255, 255, 255, 0.02)',
            border: `1px solid ${name.trim() ? 'rgba(34, 211, 238, 0.25)' : 'var(--border-subtle)'}`,
            color: name.trim() ? '#ffffff' : 'var(--text-muted)',
            fontWeight: '700', fontSize: '13px',
            cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.22s var(--ease-out)',
            fontFamily: 'var(--font-sans)',
            boxShadow: name.trim() ? '0 4px 14px rgba(34, 211, 238, 0.15)' : 'none',
          }}
          onMouseEnter={e => {
            if (name.trim() && !loading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(34, 211, 238, 0.3)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = name.trim() ? '0 4px 14px rgba(34, 211, 238, 0.15)' : 'none';
          }}
        >
          {loading ? (
            <><Spinner /> Syncing Node…</>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Deploy Node
            </>
          )}
        </button>
      </form>

      {toast && <SuccessToast message={toast} onDone={() => setToast(null)} />}
      {errToast && <AlertToast message={errToast} onDone={() => setErrToast(null)} />}
    </>
  );
}