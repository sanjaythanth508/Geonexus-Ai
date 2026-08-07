import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/Map/MapComponent';
import Layout from '../components/Common/Layout';

/* ── Icons ── */
const HomeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const ArrowIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const PinIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const CrosshairIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>;

export default function AnalysisMap() {
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState(null);

  const handleLocationSelect = (loc) => {
    setSelectedLocation(loc);
    sessionStorage.removeItem('better_site_suggestion');
    sessionStorage.removeItem('last_prediction_report');
  };

  const handleContinue = () => {
    if (!selectedLocation) return;
    sessionStorage.setItem('analysisLocation', JSON.stringify(selectedLocation));
    navigate('/analysis/run', { state: { location: selectedLocation } });
  };

  return (
    <Layout hideNav={true}>
      <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

        {/* Floating top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
          padding: '16px clamp(16px,4vw,32px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent',
          pointerEvents: 'none',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', pointerEvents: 'all' }}>
            <button
              onClick={() => navigate('/home')}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px',
                background: 'var(--c-surface)', border: '1px solid var(--border-default)',
                borderRadius: '12px', color: 'var(--text-secondary)', cursor: 'pointer',
                fontSize: '13px', fontWeight: '700',
                transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--c-primary-400)'; e.currentTarget.style.color = 'var(--c-primary-600)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <HomeIcon /> Home
            </button>

            <div style={{
              padding: '8px 18px', borderRadius: '12px',
              background: 'var(--c-surface)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: '850', fontSize: '15px', letterSpacing: '-0.02em' }}>
                <span className="gradient-text">GeoNexus</span>
                <span style={{ color: 'var(--text-primary)' }}> Siting</span>
              </span>
            </div>
          </div>

          {/* Instruction pill (hidden on narrow screens) */}
          <div style={{
            pointerEvents: 'none',
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px',
            background: 'var(--c-surface)',
            border: '1px solid var(--border-default)', borderRadius: '12px',
            boxShadow: 'var(--shadow-sm)',
            color: 'var(--text-secondary)', fontSize: '12.5px', fontWeight: '700',
          }} className="hidden sm:flex">
            <CrosshairIcon />
            Select coordinates inside Gujarat state borders
          </div>
        </div>

        {/* Full-screen map rendering */}
        <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
          <MapComponent
            onLocationSelect={handleLocationSelect}
            markers={selectedLocation ? [{ lat: selectedLocation.lat, lon: selectedLocation.lon, label: 'Selected Site' }] : []}
          />
        </div>

        {/* Sliding action card at bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
          padding: 'clamp(16px,3vw,28px) clamp(16px,4vw,40px)',
          background: 'transparent',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{
            maxWidth: '600px', width: '100%',
            transform: selectedLocation ? 'translateY(0)' : 'translateY(140px)',
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            opacity: selectedLocation ? 1 : 0,
            pointerEvents: 'all'
          }}>
            <div style={{
              background: 'var(--c-surface)',
              border: '1px solid var(--border-default)', borderRadius: '20px',
              padding: '18px 24px',
              boxShadow: 'var(--shadow-xl)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: 'var(--c-primary-50)', border: '1px solid var(--c-primary-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-primary-600)',
                  }}>
                    <PinIcon />
                  </div>
                  <div>
                    <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                      Selected Coordinates
                    </p>
                    <p style={{ fontSize: '14.5px', fontWeight: '850', color: 'var(--text-primary)', margin: '2px 0 0', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                      {selectedLocation
                        ? `${Number(selectedLocation.lat).toFixed(5)}° N, ${Number(selectedLocation.lon).toFixed(5)}° E`
                        : '—'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleContinue}
                  disabled={!selectedLocation}
                  className="btn-primary"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
                    border: 'none', borderRadius: '12px',
                    fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                    transition: 'all 0.22s ease-out', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  Choose Industry <ArrowIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
