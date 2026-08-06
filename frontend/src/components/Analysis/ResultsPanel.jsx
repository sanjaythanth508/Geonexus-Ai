import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function ResultsPanel({ result, onSave }) {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [notes, setNotes] = useState('');
  const [savingStatus, setSavingStatus] = useState(null); // 'saving' | 'success' | 'error'

  // Sync default name when result changes
  useEffect(() => {
    if (result) {
      const dist = result.district || 'Gujarat';
      const ind = result.industry_type || result.industry || 'Industrial';
      setNodeName(`${dist} ${ind} Node`);
      setNotes('');
      setIsSaving(false);
      setSavingStatus(null);
    }
  }, [result]);

  if (!result) return null;

  const {
    district,
    industry_type,
    mcda_final_suitability_score,
    lightgbm_predicted_label,
    highway_corridor_bonus,
    river_reliability_bonus,
    nearest_highway_ref,
    nearest_river_name,
  } = result;

  const scoreNum = Number(mcda_final_suitability_score) || 0;
  
  // Single-word site classification
  let categoryLabel = "Moderate";
  let categoryColor = "#22D3EE"; // Cyan
  let categoryBg = "rgba(34, 211, 238, 0.12)";
  let categoryBorder = "rgba(34, 211, 238, 0.3)";

  if (scoreNum >= 75 || lightgbm_predicted_label.toLowerCase().includes('high') || lightgbm_predicted_label.toLowerCase().includes('excellent')) {
    categoryLabel = "Excellent";
    categoryColor = "#10B981"; // Green
    categoryBg = "rgba(16, 185, 129, 0.12)";
    categoryBorder = "rgba(16, 185, 129, 0.3)";
  } else if (scoreNum >= 50 || lightgbm_predicted_label.toLowerCase().includes('moderate') || lightgbm_predicted_label.toLowerCase().includes('good')) {
    categoryLabel = "Good";
    categoryColor = "#22D3EE"; // Cyan
    categoryBg = "rgba(34, 211, 238, 0.12)";
    categoryBorder = "rgba(34, 211, 238, 0.3)";
  } else {
    categoryLabel = "Poor";
    categoryColor = "#EF4444"; // Red
    categoryBg = "rgba(239, 68, 68, 0.12)";
    categoryBorder = "rgba(239, 68, 68, 0.3)";
  }

  const handleOpenReport = () => {
    navigate('/report', { state: { result } });
  };

  const handleSaveNode = async (e) => {
    e.preventDefault();
    if (!nodeName.trim()) return;

    setSavingStatus('saving');
    try {
      const payload = {
        name: nodeName.trim(),
        description: notes.trim(),
        latitude: result.latitude || result.lat,
        longitude: result.longitude || result.lon,
        analysis_data: result,
      };

      await api.post('projects/', payload);
      setSavingStatus('success');
      onSave?.(); // Trigger reload of projects list

      setTimeout(() => {
        setIsSaving(false);
        setSavingStatus(null);
      }, 1500);
    } catch (err) {
      setSavingStatus('error');
    }
  };

  return (
    <div style={{
      padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
      background: 'var(--glass-bg)', borderRadius: 'var(--r-lg)',
      border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)',
    }} className="anim-fadeIn">
      
      {/* Header & Score */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {district || "Gujarat Region"} · {industry_type}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
          <div style={{ fontSize: '36px', fontWeight: '900', fontFamily: 'var(--font-display)', color: 'var(--cyan)', lineHeight: 1 }}>
            {scoreNum.toFixed(1)} <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '600' }}>/100</span>
          </div>
        </div>
      </div>

      {!isSaving ? (
        <>
          {/* Single-word Site Classification Pill */}
          <div style={{
            padding: '14px', borderRadius: 'var(--r-md)',
            background: categoryBg, border: `1px solid ${categoryBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '800', color: categoryColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Site Classification
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: categoryColor, marginTop: '2px' }}>
                {categoryLabel}
              </div>
            </div>
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%', background: categoryColor,
              boxShadow: `0 0 10px ${categoryColor}`
            }} />
          </div>

          {/* Corridors Overview */}
          <div style={{
            padding: '12px', borderRadius: 'var(--r-sm)',
            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)',
            fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)'
          }}>
            <div>📍 <strong>Highway:</strong> {nearest_highway_ref || "NH Corridor"} <span style={{ color: 'var(--emerald)', fontWeight: '700' }}>(+{(highway_corridor_bonus * 100).toFixed(0)}%)</span></div>
            <div>🌊 <strong>Water Access:</strong> {nearest_river_name || "Regional Water"} <span style={{ color: 'var(--purple)', fontWeight: '700' }}>({(river_reliability_bonus * 100).toFixed(0)}%)</span></div>
          </div>

          {/* Buttons Layout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={handleOpenReport}
              className="btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: '13px', gap: '8px' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              View Detailed Audit & PDF Report →
            </button>

            <button
              onClick={() => setIsSaving(true)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '11px',
                borderRadius: 'var(--r-md)',
                background: 'rgba(34, 211, 238, 0.1)',
                border: '1px solid rgba(34, 211, 238, 0.25)',
                color: 'var(--cyan)',
                fontWeight: '700', fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(34, 211, 238, 0.15)';
                e.currentTarget.style.boxShadow = '0 0 10px rgba(34, 211, 238, 0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(34, 211, 238, 0.1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save as System Node
            </button>
          </div>
        </>
      ) : (
        /* Save Node Form */
        <form onSubmit={handleSaveNode} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="anim-fadeIn">
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
            💾 Configure Siting Asset
          </div>

          {/* Node Name */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Node Label / Name
            </label>
            <input
              type="text"
              value={nodeName}
              onChange={e => setNodeName(e.target.value)}
              className="input-field"
              required
              maxLength={100}
              placeholder="e.g. Surat Cotton Node"
            />
          </div>

          {/* Custom Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Operational Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input-field"
              placeholder="Add project identifiers or site constraints..."
              rows={2}
              maxLength={300}
              style={{ minHeight: '60px', resize: 'vertical' }}
            />
          </div>

          {/* Error Message */}
          {savingStatus === 'error' && (
            <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: '600' }}>
              ⚠️ Failed to save site node.
            </div>
          )}

          {/* Status Feedback */}
          {savingStatus === 'success' && (
            <div style={{ color: '#10b981', fontSize: '12.5px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              System Node Registered!
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={savingStatus === 'saving' || savingStatus === 'success'}
              className="btn-primary"
              style={{ flex: 1, padding: '9px', fontSize: '12.5px', justifyContent: 'center' }}
            >
              {savingStatus === 'saving' ? 'Saving...' : 'Deploy Node'}
            </button>
            <button
              type="button"
              onClick={() => setIsSaving(false)}
              disabled={savingStatus === 'saving'}
              style={{
                padding: '9px 14px',
                borderRadius: 'var(--r-md)',
                background: 'transparent',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
