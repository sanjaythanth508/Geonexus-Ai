import { useState } from 'react';

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
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

export default function LocationCompareModal({ isOpen, onClose, selectedData, suggestionData, onViewMap }) {
  if (!isOpen || !selectedData || !suggestionData) return null;

  const selScore = Number(selectedData.mcda_final_suitability_score || selectedData.overall_score || 0);
  const sugScore = Number(suggestionData.mcda_final_suitability_score || 0);
  const scoreDiff = (sugScore - selScore).toFixed(1);

  const selLat = selectedData.latitude || selectedData.lat;
  const selLon = selectedData.longitude || selectedData.lon;
  const sugLat = suggestionData.latitude;
  const sugLon = suggestionData.longitude;

  const distanceKm = getHaversineDistance(selLat, selLon, sugLat, sugLon);

  // Combine criteria keys
  const selCriteria = selectedData.criteria_breakdown || {};
  const sugCriteria = suggestionData.criteria_breakdown || {};
  const allKeys = Array.from(new Set([...Object.keys(selCriteria), ...Object.keys(sugCriteria)]));

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'var(--border-default)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(16px, 4vw, 32px)', overflowY: 'auto'
    }}>
      <div style={{
        maxWidth: '960px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--c-surface)', border: '1px solid var(--border-default)',
        borderRadius: '24px', boxShadow: 'var(--shadow-xl)',
        padding: 'clamp(24px, 4vw, 36px)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
        position: 'relative'
      }} className="anim-scaleUp">

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'var(--c-surface-alt)', border: '1px solid var(--border-subtle)',
            borderRadius: '50%', width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
        >
          <CloseIcon />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px',
            borderRadius: '20px', background: 'var(--c-primary-50)', border: '1px solid var(--c-primary-200)',
            fontSize: '11px', fontWeight: '800', color: 'var(--c-primary-700)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px'
          }}>
            ️ Comparative Optimization Analysis
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '900', margin: 0 }}>
            Selected Site vs. Optimized Nearby Site
          </h2>
          {distanceKm && (
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Nearby recommendation is located <b>{distanceKm} km</b> away within the 10-20km radius.
            </p>
          )}
        </div>

        {/* Score comparison cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: '16px', alignItems: 'center', marginBottom: '28px' }}>
          {/* Selected location */}
          <div style={{
            background: 'var(--c-error-light)', border: '1px solid var(--c-error)',
            borderRadius: '18px', padding: '20px', textAlign: 'center'
          }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--c-error)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
               Selected Location
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '42px', fontWeight: '900', color: 'var(--c-error)', margin: '8px 0 2px' }}>
              {selScore.toFixed(1)}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              {selectedData.district || 'Gujarat'} ({selLat ? selLat.toFixed(3) : ''}°, {selLon ? selLon.toFixed(3) : ''}°)
            </span>
          </div>

          {/* Gain badge */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: 'var(--c-success-light)', border: '1px solid var(--c-success)',
              borderRadius: '12px', padding: '10px 8px', color: 'var(--c-success)', fontWeight: '800', fontSize: '13px'
            }}>
              +{scoreDiff} pts
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '2px' }}>Score Gain</div>
            </div>
          </div>

          {/* Suggested location */}
          <div style={{
            background: 'var(--c-success-light)', border: '1px solid var(--c-success)',
            borderRadius: '18px', padding: '20px', textAlign: 'center'
          }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--c-success)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
               Optimized Suggestion
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '42px', fontWeight: '900', color: 'var(--c-success)', margin: '8px 0 2px' }}>
              {sugScore.toFixed(1)}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              {suggestionData.district || 'Gujarat'} ({sugLat ? sugLat.toFixed(3) : ''}°, {sugLon ? sugLon.toFixed(3) : ''}°)
            </span>
          </div>
        </div>

        {/* Infrastructure comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
          <div style={{ background: 'var(--c-surface-alt)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>
              ️ Highway Link
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Selected:</span>
              <span style={{ fontWeight: '700', color: 'var(--c-primary-600)' }}>{selectedData.nearest_highway_ref || 'NH Corridor'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Suggested:</span>
              <span style={{ fontWeight: '700', color: 'var(--c-success)' }}>{suggestionData.nearest_highway_ref || 'NH Corridor'}</span>
            </div>
          </div>

          <div style={{ background: 'var(--c-surface-alt)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>
               Waterway Access
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Selected:</span>
              <span style={{ fontWeight: '700', color: 'var(--c-primary-600)' }}>{selectedData.nearest_river_name || 'Regional River'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Suggested:</span>
              <span style={{ fontWeight: '700', color: 'var(--c-success)' }}>{suggestionData.nearest_river_name || 'Regional River'}</span>
            </div>
          </div>
        </div>

        {/* Criteria Breakdown Side-by-Side Table */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '800', marginBottom: '14px' }}>
            Metrics Comparison Breakdown
          </h3>
          <div className="responsive-table-container">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th style={{ color: 'var(--text-secondary)' }}>Evaluation Metric</th>
                  <th style={{ textAlign: 'right', color: 'var(--c-error)' }}>Selected Score</th>
                  <th style={{ textAlign: 'right', color: 'var(--c-success)' }}>Suggested Score</th>
                  <th style={{ textAlign: 'right', color: 'var(--c-primary-600)' }}>Delta</th>
                </tr>
              </thead>
              <tbody>
                {allKeys.map((key, idx) => {
                  const selVal = selCriteria[key]?.score_100 ?? 0;
                  const sugVal = sugCriteria[key]?.score_100 ?? 0;
                  const diff = sugVal - selVal;

                  return (
                    <tr key={key}>
                      <td style={{ textTransform: 'capitalize', fontWeight: '600' }}>
                        {key.replace(/_/g, ' ')}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--c-error)' }}>
                        {selVal.toFixed(1)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--c-success)' }}>
                        {sugVal.toFixed(1)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: diff >= 0 ? 'var(--c-success)' : 'var(--c-error)' }}>
                        {diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          {onViewMap && (
            <button
              onClick={() => { onClose(); onViewMap(); }}
              className="btn-primary"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 22px',
                borderRadius: '12px', fontWeight: '800', fontSize: '13.5px'
              }}
            >
              <MapIcon /> View Both on Map
            </button>
          )}
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{
              padding: '11px 20px', borderRadius: '12px',
              fontWeight: '700', fontSize: '13.5px'
            }}
          >
            Close Comparison
          </button>
        </div>

      </div>
    </div>
  );
}
