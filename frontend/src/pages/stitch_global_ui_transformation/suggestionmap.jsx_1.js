import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/Map/MapComponent';
import LocationCompareModal from '../components/Analysis/LocationCompareModal';
import Layout from '../components/Common/Layout';

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

export default function SuggestionMap() {
  const navigate = useNavigate();
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [lastReport, setLastReport] = useState(null);
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    try {
      const orig = sessionStorage.getItem('analysisLocation');
      if (orig) setSelectedLoc(JSON.parse(orig));

      const sug = sessionStorage.getItem('better_site_suggestion');
      if (sug) setSuggestion(JSON.parse(sug));

      const rep = sessionStorage.getItem('last_prediction_report');
      if (rep) setLastReport(JSON.parse(rep));
    } catch (e) {
      console.error("Error parsing map data:", e);
    }
  }, []);

  const sugLat = suggestion?.latitude;
  const sugLon = suggestion?.longitude;
  const sugScore = Number(suggestion?.mcda_final_suitability_score || 0);

  const selLat = selectedLoc?.latitude || selectedLoc?.lat || lastReport?.latitude;
  const selLon = selectedLoc?.longitude || selectedLoc?.lon || lastReport?.longitude;
  const selScore = Number(lastReport?.mcda_final_suitability_score || lastReport?.overall_score || 0);

  const distanceKm = getHaversineDistance(selLat, selLon, sugLat, sugLon);

  const mapMarkers = [];
  if (selLat && selLon) {
    mapMarkers.push({
      lat: Number(selLat),
      lon: Number(selLon),
      label: `Original Site (${selScore.toFixed(1)}/100)`,
      color: 'var(--c-error)'
    });
  }
  if (sugLat && sugLon) {
    mapMarkers.push({
      lat: Number(sugLat),
      lon: Number(sugLon),
      label: `Optimized Suggested Location (${sugScore.toFixed(1)}/100)`,
      color: 'var(--c-success)'
    });
  }

  return (
    <Layout hideNav={true}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

        {/* Floating Top Bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
          padding: '16px clamp(16px,4vw,32px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(to bottom, rgba(3,7,18,0.95) 0%, rgba(3,7,18,0.7) 70%, transparent 100%)',
          pointerEvents: 'none', flexWrap: 'wrap', gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', pointerEvents: 'all' }}>
            <button
              onClick={() => navigate('/report')}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px',
                background: 'var(--c-surface)', border: '1px solid var(--text-muted)',
                borderRadius: '12px', color: 'var(--text-secondary)', cursor: 'pointer',
                fontSize: '13px', fontWeight: '750', backdropFilter: 'blur(12px)',
                transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(56,189,248,0.4)'; e.currentTarget.style.color = 'var(--cyan)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <BackIcon /> Return to Report
            </button>

            <div style={{
              padding: '8px 18px', borderRadius: '12px',
              background: 'var(--c-surface)', backdropFilter: 'blur(12px)',
              border: '1px solid var(--text-muted)',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: '850', fontSize: '15px', letterSpacing: '-0.02em' }}>
                <span className="gradient-text">GeoNexus</span>
                <span style={{ color: 'var(--text-primary)' }}> Dual Map</span>
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'all' }}>
            {distanceKm && (
              <div style={{
                padding: '8px 16px', borderRadius: '12px',
                background: 'var(--c-surface)', border: '1px solid rgba(16,185,129,0.22)',
                color: 'var(--c-success)', fontSize: '13px', fontWeight: '750', backdropFilter: 'blur(12px)'
              }}>
                📍 Distance: {distanceKm} km
              </div>
            )}

            {lastReport && suggestion && (
              <button
                onClick={() => setShowCompareModal(true)}
                className="btn-primary"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px',
                  borderRadius: '12px', fontSize: '13px', fontWeight: '800', cursor: 'pointer',
                  boxShadow: 'var(--shadow-md)', fontFamily: 'var(--font-sans)'
                }}
              >
                ⚖️ Compare Both Locations
              </button>
            )}
          </div>
        </div>

        {/* Full-Screen Map Component */}
        <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
          <MapComponent
            readOnly={true}
            initialLocation={sugLat ? { latitude: Number(sugLat), longitude: Number(sugLon) } : null}
            markers={mapMarkers}
          />
        </div>

        {/* Bottom Floating Legend Bar */}
        <div style={{
          position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, width: 'calc(100% - 32px)', maxWidth: '680px', pointerEvents: 'none'
        }}>
          <div style={{
            background: 'var(--c-surface)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(56,189,248,0.22)', borderRadius: '20px',
            padding: '16px 20px', pointerEvents: 'all',
            boxShadow: 'var(--shadow-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap'
          }}>
            
            {/* Selected Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--c-error)', border: '2px solid var(--text-primary)' }} />
              <div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase' }}>Selected Location</div>
                <div style={{ fontSize: '13.5px', fontWeight: '850', color: 'var(--c-error)' }}>{selScore > 0 ? `${selScore.toFixed(1)} / 100` : '—'}</div>
              </div>
            </div>

            <div style={{ height: '30px', width: '1px', background: 'var(--text-muted)' }} className="hidden sm:block" />

            {/* Suggested Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--c-success)', border: '2px solid var(--text-primary)' }} />
              <div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase' }}>Optimized Siting</div>
                <div style={{ fontSize: '13.5px', fontWeight: '850', color: 'var(--c-success)' }}>{sugScore > 0 ? `${sugScore.toFixed(1)} / 100` : '—'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => navigate('/report')}
                className="btn-ghost"
                style={{
                  padding: '8px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: '700',
                  color: 'var(--c-error)', borderColor: 'rgba(239,68,68,0.22)'
                }}
              >
                Report
              </button>
              <button
                onClick={() => navigate('/analysis/suggestion')}
                className="btn-ghost"
                style={{
                  padding: '8px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: '700',
                  color: 'var(--c-success)', borderColor: 'rgba(16,185,129,0.22)'
                }}
              >
                Suggestion
              </button>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison Modal */}
        {showCompareModal && lastReport && suggestion && (
          <LocationCompareModal
            isOpen={showCompareModal}
            onClose={() => setShowCompareModal(false)}
            selectedData={lastReport}
            suggestionData={suggestion}
          />
        )}

      </div>
    </Layout>
  );
}
