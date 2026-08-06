import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/Map/MapComponent';

/* ── Icons ── */
const HomeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const ArrowIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const PinIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const CrosshairIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>;

export default function AnalysisMap() {
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleLocationSelect = (loc) => {
    setSelectedLocation(loc);
    setConfirmed(false);
  };

  const handleContinue = () => {
    if (!selectedLocation) return;
    sessionStorage.setItem('analysisLocation', JSON.stringify(selectedLocation));
    navigate('/analysis/run', { state: { location: selectedLocation } });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>

      {/* Floating top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        padding: '16px clamp(16px,4vw,32px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(3,7,18,0.95) 0%, rgba(3,7,18,0.7) 70%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', pointerEvents: 'all' }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px',
              background: 'rgba(11,15,25,0.9)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px', color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600', backdropFilter: 'blur(12px)',
              transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(56,189,248,0.4)'; e.currentTarget.style.color = 'var(--cyan)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <HomeIcon /> Home
          </button>

          <div style={{
            padding: '8px 18px', borderRadius: '12px',
            background: 'rgba(11,15,25,0.85)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '15px', letterSpacing: '-0.02em' }}>
              <span style={{ background: 'var(--grad-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GeoNexus</span>
              <span style={{ color: 'var(--text-primary)' }}> Analysis</span>
            </span>
          </div>
        </div>

        {/* Instruction pill */}
        <div style={{
          pointerEvents: 'none',
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px',
          background: 'rgba(11,15,25,0.85)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
          color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600',
        }}>
          <CrosshairIcon />
          Click anywhere on Gujarat to select a location
        </div>
      </div>

      {/* Full-screen map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapComponent onLocationSelect={handleLocationSelect} markers={selectedLocation ? [{ lat: selectedLocation.lat, lon: selectedLocation.lon, label: 'Selected Site' }] : []} />
      </div>

      {/* Bottom action panel - appears when location selected */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
        padding: 'clamp(16px,3vw,28px) clamp(16px,4vw,40px)',
        background: 'linear-gradient(to top, rgba(3,7,18,0.98) 0%, rgba(3,7,18,0.85) 70%, transparent 100%)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
        <div style={{
          maxWidth: '640px', width: '100%',
          transform: selectedLocation ? 'translateY(0)' : 'translateY(120px)',
          transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
          opacity: selectedLocation ? 1 : 0,
        }}>
          <div style={{
            background: 'rgba(11,15,25,0.92)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(56,189,248,0.25)', borderRadius: '20px',
            padding: '20px 24px',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,189,248,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)',
                }}>
                  <PinIcon />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                    Selected Location
                  </p>
                  <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: '2px 0 0', fontFamily: 'var(--font-display)' }}>
                    {selectedLocation
                      ? `${Number(selectedLocation.lat).toFixed(5)}° N, ${Number(selectedLocation.lon).toFixed(5)}° E`
                      : '—'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleContinue}
                disabled={!selectedLocation}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 28px',
                  background: 'var(--grad-btn)', border: 'none', borderRadius: '14px',
                  color: '#fff', fontWeight: '800', fontSize: '15px', cursor: 'pointer',
                  transition: 'all 0.2s', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)',
                  boxShadow: '0 6px 24px rgba(56,189,248,0.25)',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(56,189,248,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(56,189,248,0.25)'; }}
              >
                Choose Industry <ArrowIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
