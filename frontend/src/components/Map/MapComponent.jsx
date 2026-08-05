import { useState, useRef, useEffect } from "react";
import Map, {
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  Marker,
  Popup,               // <-- new import
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const MAPTILER_KEY = "DuG2AQwx5T5BAeQ0zLV6";

/* ── Pulsing Custom Radar Pin Marker ── */
function PulsingRadarPin() {
  return (
    <div style={{
      position: 'relative', width: '48px', height: '48px',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        position: 'absolute', width: '48px', height: '48px', borderRadius: '50%',
        border: '2px solid rgba(34, 211, 238, 0.5)',
        animation: 'pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
      }}/>
      <div style={{
        position: 'absolute', width: '48px', height: '48px', borderRadius: '50%',
        border: '2px solid rgba(59, 130, 246, 0.4)',
        animation: 'pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) 0.6s infinite',
      }}/>
      <div style={{
        position: 'absolute', width: '20px', height: '1px', background: 'var(--cyan)',
      }} />
      <div style={{
        position: 'absolute', width: '1px', height: '20px', background: 'var(--cyan)',
      }} />
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%',
        background: 'var(--cyan)',
        border: '2px solid #ffffff',
        boxShadow: '0 0 12px var(--cyan)',
        zIndex: 2,
      }}/>
    </div>
  );
}

/* ── GPS Icon with loading rotation ── */
function GpsIcon({ loading }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16" height="16"
      viewBox="0 0 16 16"
      fill={loading ? 'var(--cyan)' : '#334155'}
      style={loading ? { animation: 'spin 1s linear infinite' } : { transition: 'fill 0.2s' }}
    >
      <path d="M8.5.5a.5.5 0 0 0-1 0v.518A7 7 0 0 0 1.018 7.5H.5a.5.5 0 0 0 0 1h.518A7 7 0 0 0 7.5 14.982v.518a.5.5 0 0 0 1 0v-.518A7 7 0 0 0 14.982 8.5h.518a.5.5 0 0 0 0-1h-.518A7 7 0 0 0 8.5 1.018zm-6.48 7A6 6 0 0 1 7.5 2.02v.48a.5.5 0 0 0 1 0v-.48a6 6 0 0 1 5.48 5.48h-.48a.5.5 0 0 0 0 1h.48a6 6 0 0 1-5.48 5.48v-.48a.5.5 0 0 0-1 0v.48A6 6 0 0 1 2.02 8.5h.48a.5.5 0 0 0 0-1zM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4" />
    </svg>
  );
}

/* ── Interactive Map Instruction Hint ── */
function InstructionBanner({ visible }) {
  if (!visible) return null;
  return (
    <div className="anim-fadeIn" style={{
      position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 800, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 16px',
      background: 'rgba(10, 14, 26, 0.85)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(34, 211, 238, 0.18)',
      borderRadius: 'var(--r-full)',
      color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600',
      boxShadow: 'var(--shadow-md)',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cyan)',
        animation: 'pulse-soft 1.2s infinite',
      }}/>
      <span>Select coordinate points directly on the grid mapping area</span>
    </div>
  );
}

/* ── Modal Confirm Overlay ── */
function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="anim-fadeIn" style={{
      position: 'fixed', inset: 0, background: 'rgba(5, 8, 15, 0.65)', backdropFilter: 'blur(10px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 99999, padding: '20px',
    }}>
      <div className="glass-bright anim-scaleIn" style={{
        width: '100%', maxWidth: '390px', borderRadius: 'var(--r-xl)', overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, var(--red), var(--orange))' }}/>
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px', fontSize: '24px',
          }}>
            ⚠️
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
            Clear Selection Pin?
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
            This clears the current tracking coordinates on your workspace. You can set new mapping metrics anytime.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onCancel} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                flex: 1, padding: '10px', borderRadius: 'var(--r-sm)',
                border: 'none', background: 'var(--red)', color: '#fff',
                fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--red-dark)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--red)'}>
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tracking Info Overlay panel ── */
function TrackingPanel({ location, onClear }) {
  return (
    <div className="anim-fadeUp" style={{
      position: 'absolute', bottom: '24px', left: '16px', right: '16px', zIndex: 800,
      maxWidth: '300px',
      background: 'rgba(10, 14, 26, 0.88)',
      backdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-lg), 0 0 30px rgba(34, 211, 238, 0.05)',
      overflow: 'hidden',
    }}>
      <div style={{ height: '2px', background: 'var(--grad-brand)' }} />
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '7px',
            background: 'rgba(34, 211, 238, 0.10)', border: '1px solid rgba(34, 211, 238, 0.20)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Tracking Node
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
          {[
            { label: 'Latitude', val: location.latitude.toFixed(6) },
            { label: 'Longitude', val: location.longitude.toFixed(6) },
          ].map(row => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 10px', background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--r-xs)',
            }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>{row.label}</span>
              <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>{row.val}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '4px 8px', borderRadius: 'var(--r-full)',
            background: location.source === 'gps' ? 'rgba(16,185,129,0.08)' : 'rgba(249,115,22,0.08)',
            border: `1px solid ${location.source === 'gps' ? 'rgba(16,185,129,0.20)' : 'rgba(249,115,22,0.20)'}`,
          }}>
            <span style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: location.source === 'gps' ? 'var(--emerald)' : 'var(--orange)',
            }}/>
            <span style={{ fontSize: '10px', fontWeight: '700', color: location.source === 'gps' ? '#6EE7B7' : '#FDBA74' }}>
              {location.source === 'gps' ? 'GPS Lock' : 'Manual Point'}
            </span>
          </div>

          <button
            onClick={onClear}
            style={{
              padding: '6px 10px', borderRadius: 'var(--r-sm)', background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.18)', color: '#FCA5A5',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontWeight: '700', transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.18)';
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ──────────────────────────────────── */
export default function MapComponent({
  onLocationSelect,      // <-- NEW prop
  center = [72.5714, 23.0225],  // <-- NEW prop
  zoom = 6,              // <-- NEW prop
  markers = [],          // <-- NEW prop: [{ lat, lon, label }]
}) {
  const mapRef = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [analysisLocation, setAnalysisLocation] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showInstruction, setShowInstruction] = useState(true);

  // Restore saved location from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("analysisLocation");
      if (saved && saved !== "undefined") {
        const loc = JSON.parse(saved);
        if (loc && typeof loc.latitude === "number" && typeof loc.longitude === "number") {
          setAnalysisLocation(loc);
          setShowInstruction(false);
          notifyParent(loc);
          setTimeout(() => {
            mapRef.current?.flyTo({ center: [loc.longitude, loc.latitude], zoom: 16, speed: 1.2 });
          }, 400);
        } else {
          sessionStorage.removeItem("analysisLocation");
        }
      }
    } catch (e) {
      console.error("Error parsing saved location:", e);
      sessionStorage.removeItem("analysisLocation");
    }
    const t = setTimeout(() => setShowInstruction(false), 6000);
    return () => clearTimeout(t);
  }, []);

  // ----- helper: notify parent when location changes
  const notifyParent = (coords) => {
    if (onLocationSelect) {
      onLocationSelect({ lat: coords.latitude, lon: coords.longitude });
    }
  };

  // ----- GPS handler
  const handleGpsSync = () => {
    if (!navigator.geolocation) {
      alert("Browser GPS utilities not enabled.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, source: "gps" };
        setAnalysisLocation(coords);
        setShowInstruction(false);
        sessionStorage.setItem("analysisLocation", JSON.stringify(coords));
        mapRef.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 16, speed: 1.4 });
        setGpsLoading(false);
        notifyParent(coords);  // <-- NEW
      },
      () => {
        alert("GPS synchronization error.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // ----- Map click handler
  const handleMapTap = (e) => {
    const { lng, lat } = e.lngLat;
    const coords = { latitude: lat, longitude: lng, source: "map" };
    setAnalysisLocation(coords);
    setShowInstruction(false);
    sessionStorage.setItem("analysisLocation", JSON.stringify(coords));
    notifyParent(coords);  // <-- NEW
  };

  // ----- Clear pin
  const handleConfirmClear = () => {
    setAnalysisLocation(null);
    sessionStorage.removeItem("analysisLocation");
    setShowConfirmModal(false);
    setShowInstruction(true);
    // Optionally notify parent that selection is cleared?
    // If you want, call onLocationSelect(null) or undefined.
    // The original snippet clears the marker but doesn't notify.
    // We'll leave it as is.
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>

      {/* GPS button */}
      <button
        onClick={handleGpsSync}
        disabled={gpsLoading}
        data-tip={gpsLoading ? "Synchronizing Satellite..." : "Request GPS Coordinate Sync"}
        style={{
          position: "absolute", top: "76px", right: "10px", zIndex: 800,
          width: "36px", height: "36px", border: "1px solid var(--border-default)",
          borderRadius: "8px", background: gpsLoading ? "var(--glass-bg)" : "rgba(10,14,26,0.90)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: gpsLoading ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          boxShadow: 'var(--shadow-md)',
          backdropFilter: 'blur(8px)',
        }}
        onMouseEnter={e => {
          if (!gpsLoading) {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.borderColor = "var(--border-accent)";
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.borderColor = "var(--border-default)";
        }}
      >
        <GpsIcon loading={gpsLoading} />
      </button>

      {/* Instruction banner */}
      <InstructionBanner visible={showInstruction && !analysisLocation} />

      {/* Main Map */}
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: center[0],   // <-- use prop
          latitude: center[1],    // <-- use prop
          zoom: zoom,             // <-- use prop
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={`https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`}
        onClick={handleMapTap}
        cursor={analysisLocation ? 'default' : 'crosshair'}
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />
        <ScaleControl position="bottom-left" />

        {/* Selected point marker (radar pin) */}
        {analysisLocation && (
          <Marker longitude={analysisLocation.longitude} latitude={analysisLocation.latitude} anchor="center">
            <PulsingRadarPin />
          </Marker>
        )}

        {/* ── NEW: Saved site markers from `markers` prop ── */}
        {markers.map((m, idx) => (
          <Marker
            key={idx}
            longitude={m.lon}
            latitude={m.lat}
            anchor="bottom"
          >
            <div style={{
              background: '#1F8A70',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }} />
            {m.label && (
              <Popup
                longitude={m.lon}
                latitude={m.lat}
                closeButton={false}
                offset={[0, -10]}
              >
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{m.label}</span>
              </Popup>
            )}
          </Marker>
        ))}
      </Map>

      {/* Tracking panel */}
      {analysisLocation && (
        <TrackingPanel
          location={analysisLocation}
          onClear={() => setShowConfirmModal(true)}
        />
      )}

      {/* Confirm modal */}
      {showConfirmModal && (
        <ConfirmModal
          onConfirm={handleConfirmClear}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}