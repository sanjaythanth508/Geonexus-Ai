import { useState, useRef, useEffect } from "react";
import Map, {
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  Marker,
  Popup,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { isInsideGujarat } from "../../utils/locationValidation";

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
        border: '2px solid rgba(56, 189, 248, 0.5)',
        animation: 'pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
      }}/>
      <div style={{
        position: 'absolute', width: '48px', height: '48px', borderRadius: '50%',
        border: '2px solid rgba(99, 102, 241, 0.4)',
        animation: 'pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) 0.6s infinite',
      }}/>
      <div style={{
        position: 'absolute', width: '20px', height: '1px', background: 'var(--cyan)',
      }} />
      <div style={{
        position: 'absolute', width: '1px', height: '20px', background: 'var(--cyan)',
      }} />
      <div style={{
        width: '12px', height: '12px', borderRadius: '50%',
        background: 'var(--cyan)',
        border: '2px solid #ffffff',
        boxShadow: '0 0 16px var(--cyan)',
        zIndex: 2,
      }}/>
    </div>
  );
}

/* ── High-Tech Target Crosshair Icon ── */
function TargetCrosshairIcon({ loading }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={loading ? { animation: 'spin 0.8s linear infinite', color: 'var(--cyan)' } : { color: 'var(--cyan)' }}
    >
      <circle cx="12" cy="12" r="8" strokeOpacity="0.4" />
      <circle cx="12" cy="12" r="3" fill="var(--cyan)" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
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
      padding: '8px 18px',
      background: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(56, 189, 248, 0.25)',
      borderRadius: 'var(--r-full)',
      color: 'var(--text-primary)', fontSize: '12px', fontWeight: '600',
      boxShadow: 'var(--shadow-md), 0 0 20px rgba(56, 189, 248, 0.1)',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cyan)',
        animation: 'pulse-soft 1.2s infinite',
      }}/>
      <span>Select coordinate points inside Gujarat State</span>
    </div>
  );
}

/* ── Gujarat Territory Warning Toast Banner ── */
function WarningBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="anim-bounceIn" style={{
      position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 990,
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 20px',
      background: 'rgba(244, 63, 94, 0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: 'var(--r-md)',
      color: '#FFFFFF', fontSize: '13px', fontWeight: '700',
      boxShadow: '0 12px 36px rgba(244, 63, 94, 0.45)',
    }}>
      <span style={{ fontSize: '16px' }}>⚠️</span>
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none', border: 'none', color: '#FFF',
          cursor: 'pointer', marginLeft: '8px', fontSize: '14px', fontWeight: '900'
        }}
      >
        ✕
      </button>
    </div>
  );
}

/* ── Modal Confirm Overlay ── */
function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="anim-fadeIn" style={{
      position: 'fixed', inset: 0, background: 'rgba(3, 7, 18, 0.75)', backdropFilter: 'blur(12px)',
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
            background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)',
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
                boxShadow: '0 4px 14px rgba(244, 63, 94, 0.3)',
              }}>
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
      position: 'absolute', bottom: '24px', left: '16px', zIndex: 800,
      width: 'calc(100% - 32px)', maxWidth: '310px',
      background: 'rgba(11, 15, 25, 0.90)',
      backdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-lg), 0 0 35px rgba(56, 189, 248, 0.08)',
      overflow: 'hidden',
    }}>
      <div style={{ height: '2px', background: 'var(--grad-brand)' }} />
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '7px',
            background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Gujarat Site Lock
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
          {[
            { label: 'Latitude', val: location.latitude.toFixed(6) },
            { label: 'Longitude', val: location.longitude.toFixed(6) },
          ].map(row => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 10px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--r-xs)',
            }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600' }}>{row.label}</span>
              <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>{row.val}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '4px 9px', borderRadius: 'var(--r-full)',
            background: location.source === 'gps' ? 'rgba(16,185,129,0.12)' : 'rgba(249,115,22,0.12)',
            border: `1px solid ${location.source === 'gps' ? 'rgba(16,185,129,0.25)' : 'rgba(249,115,22,0.25)'}`,
          }}>
            <span style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: location.source === 'gps' ? 'var(--emerald)' : 'var(--orange)',
            }}/>
            <span style={{ fontSize: '10.5px', fontWeight: '700', color: location.source === 'gps' ? '#34D399' : '#FDBA74' }}>
              {location.source === 'gps' ? 'GPS Lock' : 'Gujarat Territory'}
            </span>
          </div>

          <button
            onClick={onClear}
            style={{
              padding: '6px 12px', borderRadius: 'var(--r-sm)', background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.25)', color: '#FDA4AF',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontWeight: '700', transition: 'all 0.2s',
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN MAP COMPONENT ──────────────────────────────────── */
export default function MapComponent({
  onLocationSelect,
  center = [71.1924, 22.2587], // Centered over Gujarat state
  zoom = 7,
  markers = [],
}) {
  const mapRef = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [analysisLocation, setAnalysisLocation] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showInstruction, setShowInstruction] = useState(true);
  const [warningMessage, setWarningMessage] = useState(null);

  // Restore saved location from sessionStorage if inside Gujarat
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("analysisLocation");
      if (saved && saved !== "undefined") {
        const loc = JSON.parse(saved);
        if (loc && typeof loc.latitude === "number" && typeof loc.longitude === "number") {
          if (isInsideGujarat(loc.latitude, loc.longitude)) {
            setAnalysisLocation(loc);
            setShowInstruction(false);
            notifyParent(loc);
            setTimeout(() => {
              mapRef.current?.flyTo({ center: [loc.longitude, loc.latitude], zoom: 14, speed: 1.2 });
            }, 400);
          } else {
            sessionStorage.removeItem("analysisLocation");
          }
        }
      }
    } catch (e) {
      console.error("Error parsing saved location:", e);
      sessionStorage.removeItem("analysisLocation");
    }
    const t = setTimeout(() => setShowInstruction(false), 6000);
    return () => clearTimeout(t);
  }, []);

  const notifyParent = (coords) => {
    if (onLocationSelect) {
      onLocationSelect({ lat: coords.latitude, lon: coords.longitude });
    }
  };

  // ----- GPS Live Location handler
  const handleGpsSync = () => {
    if (!navigator.geolocation) {
      setWarningMessage("GPS geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    setWarningMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!isInsideGujarat(latitude, longitude)) {
          setWarningMessage(`Your GPS location (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E) is outside Gujarat! Auto-centering map over Gujarat...`);
          setGpsLoading(false);
          mapRef.current?.flyTo({ center: [71.1924, 22.2587], zoom: 8, speed: 1.2 });
          return;
        }

        const coords = { latitude, longitude, source: "gps" };
        setAnalysisLocation(coords);
        setShowInstruction(false);
        setWarningMessage(null);
        sessionStorage.setItem("analysisLocation", JSON.stringify(coords));
        mapRef.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 14, speed: 1.4 });
        setGpsLoading(false);
        notifyParent(coords);
      },
      (err) => {
        console.warn("GPS sync error:", err);
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setWarningMessage("Location permission denied. Please allow location access or click on the Gujarat map manually.");
        } else {
          setWarningMessage("Could not retrieve precise GPS coordinates. Please click your target point inside Gujarat.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ----- Map click handler
  const handleMapTap = (e) => {
    const { lng, lat } = e.lngLat;
    if (!isInsideGujarat(lat, lng)) {
      setWarningMessage(`Location (${lat.toFixed(4)}, ${lng.toFixed(4)}) is OUTSIDE Gujarat! Please select a location inside Gujarat.`);
      return;
    }

    setWarningMessage(null);
    const coords = { latitude: lat, longitude: lng, source: "map" };
    setAnalysisLocation(coords);
    setShowInstruction(false);
    sessionStorage.setItem("analysisLocation", JSON.stringify(coords));
    notifyParent(coords);
  };

  // ----- Clear pin
  const handleConfirmClear = () => {
    setAnalysisLocation(null);
    sessionStorage.removeItem("analysisLocation");
    setShowConfirmModal(false);
    setShowInstruction(true);
    setWarningMessage(null);
    if (onLocationSelect) onLocationSelect(null);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>

      {/* ── HIGHLY STYLED FLOATING LIVE LOCATION PILL BUTTON ── */}
      <button
        onClick={handleGpsSync}
        disabled={gpsLoading}
        title={gpsLoading ? "Acquiring GPS Signal..." : "Locate My GPS Position in Gujarat"}
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          zIndex: 800,
          display: "inline-flex",
          alignItems: "center",
          gap: "9px",
          padding: "10px 18px",
          background: "linear-gradient(135deg, rgba(11, 15, 25, 0.92) 0%, rgba(15, 23, 42, 0.95) 100%)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(56, 189, 248, 0.35)",
          borderRadius: "var(--r-full)",
          color: "#F8FAFC",
          fontSize: "12.5px",
          fontWeight: "700",
          fontFamily: "var(--font-sans)",
          cursor: gpsLoading ? "not-allowed" : "pointer",
          transition: "all 0.25s var(--ease-out)",
          boxShadow: "0 10px 28px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.2)",
          userSelect: "none",
        }}
        onMouseEnter={e => {
          if (!gpsLoading) {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
            e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.7)';
            e.currentTarget.style.boxShadow = '0 14px 36px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.4)';
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.35)';
          e.currentTarget.style.boxShadow = '0 10px 28px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.2)';
        }}
      >
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%',
          background: 'rgba(56, 189, 248, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <TargetCrosshairIcon loading={gpsLoading} />
        </div>
        <span>{gpsLoading ? "Locking GPS..." : "Live Location"}</span>
      </button>

      {/* Warning Banner */}
      <WarningBanner message={warningMessage} onClose={() => setWarningMessage(null)} />

      {/* Instruction banner */}
      <InstructionBanner visible={showInstruction && !analysisLocation && !warningMessage} />

      {/* Main Map */}
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
          zoom: zoom,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={`https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`}
        onClick={handleMapTap}
        cursor={analysisLocation ? 'default' : 'crosshair'}
      >
        <NavigationControl position="top-right" style={{ marginTop: '64px' }} />
        <FullscreenControl position="top-right" style={{ marginTop: '64px' }} />
        <ScaleControl position="bottom-left" />

        {/* Selected point marker */}
        {analysisLocation && (
          <Marker longitude={analysisLocation.longitude} latitude={analysisLocation.latitude} anchor="center">
            <PulsingRadarPin />
          </Marker>
        )}

        {/* Saved site markers */}
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