import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/Map/MapComponent';
import LocationCompareModal from '../components/Analysis/LocationCompareModal';

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
      label: `Selected Location (${selScore.toFixed(1)}/100)`,
      color: '#EF4444'
    });
  }
  if (sugLat && sugLon) {
    mapMarkers.push({
      lat: Number(sugLat),
      lon: Number(sugLon),
      label: `Optimized Suggested Location (${sugScore.toFixed(1)}/100)`,
      color: '#10B981'
    });
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>

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
            onClick={() => window.history.back()}
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
            <BackIcon /> Back to Report
          </button>

          <div style={{
            padding: '8px 18px', borderRadius: '12px',
            background: 'rgba(11,15,25,0.85)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '15px', letterSpacing: '-0.02em' }}>
              <span style={{ background: 'var(--grad-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GeoNexus</span>
              <span style={{ color: '#10B981' }}> Dual Map View</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'all' }}>
          {distanceKm && (
            <div style={{
              padding: '8px 16px', borderRadius: '12px',
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              color: '#10B981', fontSize: '13px', fontWeight: '700', backdropFilter: 'blur(12px)'
            }}>
              📍 Distance: {distanceKm} km
            </div>
          )}

          {lastReport && suggestion && (
            <button
              onClick={() => setShowCompareModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px',
                background: 'var(--grad-btn)', border: 'none', borderRadius: '12px',
                color: '#fff', fontSize: '13px', fontWeight: '800', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(56,189,248,0.25)', fontFamily: 'var(--font-sans)'
              }}
            >
              ⚖️ Side-by-Side Compare
            </button>
          )}
        </div>
      </div>

      {/* Full-Screen Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapComponent
          readOnly={true}
          initialLocation={sugLat ? { latitude: Number(sugLat), longitude: Number(sugLon) } : null}
          markers={mapMarkers}
        />
      </div>

      {/* Bottom Floating Legend / Control Panel */}
      <div style={{
        position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, width: 'calc(100% - 32px)', maxWidth: '680px',
      }}>
        <div style={{
          background: 'rgba(11,15,25,0.92)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(56,189,248,0.25)', borderRadius: '20px',
          padding: '16px 20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,189,248,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap'
        }}>
          {/* Selected Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#EF4444', border: '2px solid #fff' }} />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Selected Site</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#EF4444' }}>{selScore > 0 ? `${selScore.toFixed(1)} / 100` : 'Selected'}</div>
            </div>
          </div>

          <div style={{ height: '30px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />

          {/* Suggested Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#10B981', border: '2px solid #fff' }} />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Optimized Nearby Site</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#10B981' }}>{sugScore > 0 ? `${sugScore.toFixed(1)} / 100` : 'Suggested'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate('/report')}
              style={{
                padding: '8px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: '700',
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#EF4444', cursor: 'pointer', fontFamily: 'var(--font-sans)'
              }}
            >
              View Report
            </button>
            <button
              onClick={() => navigate('/analysis/suggestion')}
              style={{
                padding: '8px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: '700',
                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                color: '#10B981', cursor: 'pointer', fontFamily: 'var(--font-sans)'
              }}
            >
              View Suggestion
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Modal */}
      {showCompareModal && lastReport && suggestion && (
        <LocationCompareModal
          isOpen={showCompareModal}
          onClose={() => setShowCompareModal(false)}
          selectedData={lastReport}
          suggestionData={suggestion}
        />
      )}

    </div>
  );
}
