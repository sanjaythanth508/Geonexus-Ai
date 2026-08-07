import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { findSuggestion } from '../api/analysis';
import api from '../api/client';
import Layout from '../components/Common/Layout';

/* ── Icons ── */
const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const PinIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const SpinIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" style={{ animation: 'spin 0.75s linear infinite', transformOrigin: 'center' }}/></svg>;

export default function AnalysisResult() {
  const navigate = useNavigate();

  const location = (() => { try { return JSON.parse(sessionStorage.getItem('analysisLocation') || 'null'); } catch { return null; } })();
  const [result] = useState(() => { try { return JSON.parse(sessionStorage.getItem('last_prediction_report') || 'null'); } catch { return null; } });
  
  const [savingNode, setSavingNode] = useState(false);
  const [error, setError] = useState('');

  const [searchingSuggestion, setSearchingSuggestion] = useState(false);
  const [searchedSuggestion, setSearchedSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState(() => { try { return JSON.parse(sessionStorage.getItem('better_site_suggestion') || 'null'); } catch { return null; } });

  useEffect(() => {
    if (suggestion) setSearchedSuggestion(true);
  }, [suggestion]);

  if (!result || !location) {
    return (
      <Layout>
        <div style={{
          minHeight: '60vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px',
          color: 'var(--text-primary)', textAlign: 'center', padding: '24px'
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: '850', fontSize: '20px' }}>No Analysis Result Logged</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '380px' }}>
            Please select a location and run a suitability scoring simulation first.
          </p>
          <button onClick={() => navigate('/analysis')} className="btn-primary" style={{ padding: '12px 24px' }}>
            Go to Map view
          </button>
        </div>
      </Layout>
    );
  }

  const scoreNum = Number(result.mcda_final_suitability_score || 0);
  let badgeColor = '#22D3EE', badgeBg = 'rgba(34,211,238,0.08)', badgeBorder = 'rgba(34,211,238,0.22)', categoryLabel = 'Good';
  if (scoreNum >= 70) { badgeColor = 'var(--c-success)'; badgeBg = 'rgba(16,185,129,0.08)'; badgeBorder = 'rgba(16,185,129,0.22)'; categoryLabel = 'Excellent'; }
  else if (scoreNum < 45) { badgeColor = '#F43F5E'; badgeBg = 'rgba(244,63,94,0.08)'; badgeBorder = 'rgba(244,63,94,0.22)'; categoryLabel = 'Poor'; }

  const handleDeployNode = async () => {
    setSavingNode(true);
    setError('');
    try {
      const district = result.district || 'Gujarat';
      const industry = result.industry_type;
      await api.post('projects/', {
        name: `${industry} – ${district}`,
        latitude: location.lat || location.latitude,
        longitude: location.lon || location.longitude,
        description: '',
        analysis_data: result,
      });
      navigate('/nodes');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save node to catalog.');
    } finally {
      setSavingNode(false);
    }
  };

  const handleFindSuggestion = async () => {
    if (searchingSuggestion) return;
    setSearchingSuggestion(true);
    setError('');
    try {
      const res = await findSuggestion({
        latitude: location.lat || location.latitude,
        longitude: location.lon || location.longitude,
        industryType: result.industry_type,
        currentScore: scoreNum,
      });
      setSuggestion(res || null);
      if (res) {
        sessionStorage.setItem('better_site_suggestion', JSON.stringify(res));
      } else {
        sessionStorage.removeItem('better_site_suggestion');
      }
      setSearchedSuggestion(true);
    } catch (e) {
      console.error("Suggestion search error:", e);
      setError('An error occurred while scanning suggested nearby sites.');
    } finally {
      setSearchingSuggestion(false);
    }
  };

  return (
    <Layout>
      {/* Sub-header Navigation */}
      <div style={{
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '12px clamp(16px, 4vw, 40px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
          <button
            onClick={() => navigate('/analysis/run')}
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12.5px' }}
          >
            <BackIcon /> Change Industry
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
            background: 'var(--c-surface)', border: '1px solid rgba(56,189,248,0.2)',
            borderRadius: '20px', fontSize: '12.5px', fontWeight: '750', color: 'var(--cyan)',
            fontVariantNumeric: 'tabular-nums'
          }}>
            <PinIcon />
            {Number(location.lat || location.latitude).toFixed(5)}° N, {Number(location.lon || location.longitude).toFixed(5)}° E
          </div>
        </div>
      </div>

      <main style={{ maxWidth: '960px', width: '100%', margin: '0 auto', padding: 'clamp(28px,4vw,48px) clamp(16px,4vw,40px)' }} className="anim-fadeIn">
        {/* Score Display Card */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px',
            borderRadius: '20px', background: `${badgeBg}`, border: `1px solid ${badgeBorder}`,
            marginBottom: '20px', fontSize: '12px', fontWeight: '800', color: badgeColor,
            letterSpacing: '0.04em', textTransform: 'uppercase'
          }}>
            ✓ Suitability Simulation Complete
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,4vw,42px)', fontWeight: '900', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            {result.district || 'Gujarat Region'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14.5px', margin: '0 0 28px', fontWeight: '500' }}>
            Sector: <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{result.industry_type}</span>
          </p>

          {/* Score ring */}
          <div style={{
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
            padding: '28px 48px', borderRadius: '24px',
            background: badgeBg, border: `2px solid ${badgeBorder}`,
            boxShadow: `0 12px 32px ${badgeBg}`,
            marginBottom: '32px'
          }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Suitability Score</span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '64px', fontWeight: '950', color: badgeColor, lineHeight: 1, margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
              {scoreNum.toFixed(1)}
            </div>
            <span style={{ fontSize: '15px', color: badgeColor, fontWeight: '800' }}>/ 100 — {categoryLabel}</span>
          </div>
        </div>

        {/* Optimizations */}
        {!searchedSuggestion && !searchingSuggestion && (
          <div style={{
            background: 'var(--c-surface)',
            border: '1px solid rgba(56, 189, 248, 0.22)',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
              <span style={{ fontSize: '28px' }}>💡</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '850', color: 'var(--cyan)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                  Nearby Coordinate Optimization
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Scan mapping zones and GETCO substations within 20 km to discover higher-scoring alternative sites for <b>{result.industry_type}</b>.
                </p>
              </div>
            </div>
            <button
              onClick={handleFindSuggestion}
              className="btn-primary"
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                whiteSpace: 'nowrap'
              }}
            >
              💡 Scan Suggested Area (20km)
            </button>
          </div>
        )}

        {searchingSuggestion && (
          <div style={{
            background: 'var(--c-surface)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            color: 'var(--cyan)',
            fontWeight: '700',
            fontSize: '13.5px'
          }}>
            <SpinIcon />
            <span>Scanning industrial grids & transportation zones inside 20 km...</span>
          </div>
        )}

        {searchedSuggestion && suggestion && suggestion.mcda_final_suitability_score && (
          <div style={{
            background: 'var(--c-surface)',
            border: '1px solid rgba(16, 185, 129, 0.22)',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
              <span style={{ fontSize: '28px' }}>🚀</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '850', color: 'var(--c-success)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                  Higher-Suitability Location Identified!
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  We found a better site for <b>{result.industry_type}</b> in the <b>{suggestion.district || 'Gujarat'} Region</b> with an optimized suitability index of <b>{Number(suggestion.mcda_final_suitability_score).toFixed(1)}/100</b>.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/analysis/suggestion-map')}
              className="btn-primary"
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                background: 'linear-gradient(135deg, var(--c-success) 0%, #059669 100%)',
                boxShadow: 'var(--shadow-md)',
                whiteSpace: 'nowrap'
              }}
            >
              🗺️ Compare on Suggestion Map
            </button>
          </div>
        )}

        {searchedSuggestion && (!suggestion || !suggestion.mcda_final_suitability_score) && (
          <div style={{
            background: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '24px' }}>✨</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '750', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                Site Position Confirmed Optimal
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                This selected coordinates coordinate represents the most suitable site layout for <b>{result.industry_type}</b> within a 20 km local radius.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'var(--c-surface)', border: '1px solid rgba(244,63,94,0.22)', color: 'var(--c-error)', fontSize: '13.5px', fontWeight: '700', marginBottom: '24px', textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/report')}
            className="btn-ghost"
            style={{ padding: '12px 24px', fontSize: '13.5px', fontWeight: '750', gap: '6px' }}
          >
            📊 View Siting Audit Report
          </button>
          <button
            onClick={handleDeployNode}
            disabled={savingNode}
            className="btn-primary"
            style={{
              padding: '12px 28px', fontSize: '13.5px', gap: '6px',
              opacity: savingNode ? 0.7 : 1,
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {savingNode ? 'Cataloging...' : '💾 Deploy Analysis as Node'}
          </button>
        </div>
      </main>
    </Layout>
  );
}
