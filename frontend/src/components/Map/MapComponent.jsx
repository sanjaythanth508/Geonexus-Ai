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
        border: '2px solid var(--c-primary-300)',
        animation: 'pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
      }}/>
      <div style={{
        position: 'absolute', width: '48px', height: '48px', borderRadius: '50%',
        border: '2px solid var(--c-primary-400)',
        animation: 'pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) 0.6s infinite',
      }}/>
      <div style={{
        position: 'absolute', width: '20px', height: '1px', background: 'var(--c-primary-500)',
      }} />
      <div style={{
        position: 'absolute', width: '1px', height: '20px', background: 'var(--c-primary-500)',
      }} />
      <div style={{
        width: '12px', height: '12px', borderRadius: '50%',
        background: 'var(--c-primary-600)',
        border: '2px solid var(--text-primary)fff',
        boxShadow: 'var(--shadow-sm)',
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
      style={loading ? { animation: 'spin 0.8s linear infinite', color: 'var(--c-primary-500)' } : { color: 'var(--c-primary-500)' }}
    >
      <circle cx="12" cy="12" r="8" strokeOpacity="0.4" />
      <circle cx="12" cy="12" r="3" fill="var(--c-primary-500)" />
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
      background: 'var(--c-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--r-full)',
      color: 'var(--text-primary)', fontSize: '12px', fontWeight: '600',
      boxShadow: 'var(--shadow-md)',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%', background: 'var(--c-primary-500)',
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
      background: 'var(--c-error)',
      border: '1px solid var(--c-error-light)',
      borderRadius: 'var(--r-md)',
      color: 'var(--text-primary)', fontSize: '13px', fontWeight: '700',
      boxShadow: 'var(--shadow-md)',
    }}>
      <span style={{ fontSize: '16px' }}>️</span>
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none', border: 'none', color: '#FFF',
          cursor: 'pointer', marginLeft: '8px', fontSize: '14px', fontWeight: '900'
        }}
      >
        
      </button>
    </div>
  );
}

/* ── Modal Confirm Overlay ── */
function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="anim-fadeIn" style={{
      position: 'fixed', inset: 0, background: 'var(--border-default)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 99999, padding: '20px',
    }}>
      <div className="anim-scaleIn" style={{
        width: '100%', maxWidth: '390px', borderRadius: 'var(--r-xl)', overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)', background: 'var(--c-surface)'
      }}>
        <div style={{ height: '3px', background: 'var(--c-warning)' }}/>
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'var(--c-warning-light)', border: '1px solid var(--c-warning)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px', fontSize: '24px',
          }}>
            ️
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
                border: 'none', background: 'var(--red)', color: 'var(--text-primary)',
                fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
                boxShadow: 'var(--shadow-md)',
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
      background: 'var(--c-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-lg)',
      overflow: 'hidden',
    }}>
      <div style={{ height: '2px', background: 'var(--c-primary-500)' }} />
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '7px',
            background: 'var(--c-primary-50)', border: '1px solid var(--c-primary-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--c-primary-600)" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
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
              padding: '6px 10px', background: 'var(--c-surface-alt)',
              border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-xs)',
            }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>{row.label}</span>
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
            className="btn-ghost"
            style={{
              padding: '6px 12px', borderRadius: 'var(--r-sm)', color: 'var(--c-error)',
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontWeight: '700'
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
  initialLocation = null,
  readOnly = false,
}) {
  const mapRef = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [analysisLocation, setAnalysisLocation] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showInstruction, setShowInstruction] = useState(true);
  const [warningMessage, setWarningMessage] = useState(null);

  // Restore saved location from sessionStorage or initialLocation if inside Gujarat
  useEffect(() => {
    try {
      if (initialLocation) {
        if (isInsideGujarat(initialLocation.latitude, initialLocation.longitude)) {
          setAnalysisLocation(initialLocation);
          setShowInstruction(false);
          setTimeout(() => {
            mapRef.current?.flyTo({ center: [initialLocation.longitude, initialLocation.latitude], zoom: 12, speed: 1.2 });
          }, 400);
        }
      } else {
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
      }
    } catch (e) {
      console.error("Error parsing saved location:", e);
      sessionStorage.removeItem("analysisLocation");
    }
    const t = setTimeout(() => setShowInstruction(false), 6000);
    return () => clearTimeout(t);
  }, [initialLocation]);

  const notifyParent = (coords) => {
    if (onLocationSelect && !readOnly) {
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
    if (readOnly) return;
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
    if (readOnly) return;
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
      {!readOnly && (
        <button
          onClick={handleGpsSync}
          disabled={gpsLoading}
          title={gpsLoading ? "Acquiring GPS Signal..." : "Locate My GPS Position in Gujarat"}
          style={{
            position: "absolute",
            top: "80px",
            right: "16px",
            zIndex: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: "9px",
            padding: "10px 18px",
            background: "var(--c-surface)",
            border: "1px solid var(--c-primary-300)",
            borderRadius: "var(--r-full)",
            color: "var(--text-primary)",
            fontSize: "12.5px",
            fontWeight: "700",
            fontFamily: "var(--font-sans)",
            cursor: gpsLoading ? "not-allowed" : "pointer",
            transition: "all 0.25s var(--ease-out)",
            boxShadow: "var(--shadow-md)",
            userSelect: "none",
          }}
          onMouseEnter={e => {
            if (!gpsLoading) {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
              e.currentTarget.style.borderColor = 'var(--c-primary-500)';
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.borderColor = 'var(--c-primary-300)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
        >
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%',
            background: 'var(--c-primary-50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <TargetCrosshairIcon loading={gpsLoading} />
          </div>
          <span>{gpsLoading ? "Locking GPS..." : "Live Location"}</span>
        </button>
      )}

      {/* Warning Banner */}
      {!readOnly && <WarningBanner message={warningMessage} onClose={() => setWarningMessage(null)} />}

      {/* Instruction banner */}
      {!readOnly && <InstructionBanner visible={showInstruction && !analysisLocation && !warningMessage} />}

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
        onClick={readOnly ? undefined : handleMapTap}
        cursor={readOnly ? 'default' : (analysisLocation ? 'default' : 'crosshair')}
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
              background: m.color || '#1F8A70',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: 'var(--shadow-md)',
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
      {analysisLocation && !readOnly && (
        <TrackingPanel
          location={analysisLocation}
          onClear={() => setShowConfirmModal(true)}
        />
      )}

      {/* Confirm modal */}
      {showConfirmModal && !readOnly && (
        <ConfirmModal
          onConfirm={handleConfirmClear}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}