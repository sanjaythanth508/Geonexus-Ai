import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { findSuggestion } from '../api/analysis';
import api from '../api/client';

/* ── Icons ── */
const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const PinIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;

export default function AnalysisResult() {
  const navigate = useNavigate();

  const location = (() => { try { return JSON.parse(sessionStorage.getItem('analysisLocation') || 'null'); } catch { return null; } })();
  const [result, setResult] = useState(() => { try { return JSON.parse(sessionStorage.getItem('last_prediction_report') || 'null'); } catch { return null; } });
  
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
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: '800' }}>No Analysis Result Found</h2>
        <button onClick={() => navigate('/analysis')} style={{ padding: '11px 24px', background: 'var(--grad-btn)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          Go to Map →
        </button>
      </div>
    );
  }

  const scoreNum = Number(result.mcda_final_suitability_score || 0);
  let badgeColor = '#22D3EE', badgeBg = 'rgba(34,211,238,0.12)', badgeBorder = 'rgba(34,211,238,0.3)', categoryLabel = 'Good';
  if (scoreNum >= 70) { badgeColor = '#10B981'; badgeBg = 'rgba(16,185,129,0.12)'; badgeBorder = 'rgba(16,185,129,0.3)'; categoryLabel = 'Excellent'; }
  else if (scoreNum < 45) { badgeColor = '#F43F5E'; badgeBg = 'rgba(244,63,94,0.12)'; badgeBorder = 'rgba(244,63,94,0.3)'; categoryLabel = 'Poor'; }

  const handleDeployNode = async () => {
    setSavingNode(true);
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
      setError(err?.response?.data?.detail || 'Failed to save node.');
    } finally {
      setSavingNode(false);
    }
  };

  const handleFindSuggestion = async () => {
    if (searchingSuggestion) return;
    setSearchingSuggestion(true);
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
    } finally {
      setSearchingSuggestion(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      {/* Bg glow */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(56,189,248,0.08) 0%, transparent 60%)' }} />

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100, height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px,4vw,40px)',
        background: 'rgba(3,7,18,0.90)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate('/analysis/run')}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600', transition: 'all 0.2s', fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(56,189,248,0.3)'; e.currentTarget.style.color = 'var(--cyan)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <BackIcon /> Back to Industry
          </button>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
              Analysis <span style={{ color: 'var(--cyan)' }}>Summary</span>
            </h1>
          </div>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '960px', margin: '0 auto', padding: 'clamp(28px,4vw,48px) clamp(16px,4vw,40px)' }}>
        <div className="anim-fadeIn">
          {/* Score hero */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: `${badgeBg}`, border: `1px solid ${badgeBorder}`, marginBottom: '16px', fontSize: '12px', fontWeight: '700', color: badgeColor, letterSpacing: '0.05em' }}>
              ✓ Analysis Complete
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,4vw,42px)', fontWeight: '900', margin: '0 0 6px', letterSpacing: '-0.04em' }}>
              {result.district || 'Gujarat Region'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: '0 0 24px' }}>
              {result.industry_type} · {Number(location.lat || location.latitude).toFixed(4)}°N, {Number(location.lon || location.longitude).toFixed(4)}°E
            </p>

            {/* Score ring */}
            <div style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
              padding: '24px 40px', borderRadius: '20px',
              background: badgeBg, border: `2px solid ${badgeBorder}`,
              boxShadow: `0 0 40px ${badgeBg}`,
            }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Suitability Score</span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '64px', fontWeight: '900', color: badgeColor, lineHeight: 1, margin: '8px 0 4px' }}>
                {scoreNum.toFixed(1)}
              </div>
              <span style={{ fontSize: '16px', color: badgeColor, fontWeight: '800' }}>/ 100 — {categoryLabel}</span>
            </div>
          </div>

          {/* On-demand Search Suggested Area Action */}
          {!searchedSuggestion && !searchingSuggestion && (
            <div style={{
              background: 'rgba(56, 189, 248, 0.06)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: 'var(--cyan)', fontFamily: 'var(--font-display)' }}>
                    Location Optimization Available
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Scan GIDC industrial estates and 4-directional gradient within 20 km to find a higher-scoring location for <b>{result.industry_type}</b>.
                  </p>
                </div>
              </div>
              <button
                onClick={handleFindSuggestion}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  background: 'var(--grad-btn)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  boxShadow: '0 4px 14px rgba(56,189,248,0.25)',
                }}
              >
                💡 Search Suggested Area (20km)
              </button>
            </div>
          )}

          {searchingSuggestion && (
            <div style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: 'var(--cyan)',
              fontWeight: '700',
              fontSize: '14px'
            }}>
              <span style={{ fontSize: '18px' }}>🔄</span> Searching GIDC industrial estates & 4-directional gradient within 20 km...
            </div>
          )}

          {searchedSuggestion && suggestion && suggestion.mcda_final_suitability_score && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: '#10B981', fontFamily: 'var(--font-display)' }}>
                    Optimized Nearby Location Found!
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Nearest this location (<b>{suggestion.district || 'Gujarat'} Region</b>) is better for your specific <b>{result.industry_type}</b> industry with a suitability score of <b>{Number(suggestion.mcda_final_suitability_score).toFixed(1)}/100</b>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/analysis/suggestion-map')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
                }}
              >
                🗺️ View Suggested Location in Map
              </button>
            </div>
          )}

          {searchedSuggestion && (!suggestion || !suggestion.mcda_final_suitability_score) && (
            <div style={{
              background: 'rgba(56, 189, 248, 0.04)',
              border: '1px solid rgba(56, 189, 248, 0.15)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: 'var(--text-secondary)'
            }}>
              <span style={{ fontSize: '24px' }}>✨</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                  Optimal Location Confirmed!
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '13px', lineHeight: 1.4 }}>
                  This selected location is the best site for your <b>{result.industry_type}</b> facility within this 20 km region. No higher-scoring location was found nearby.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: '#FCA5A5', fontSize: '14px', fontWeight: '600', marginBottom: '24px', textAlign: 'center' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Core Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/report')}
              style={{
                padding: '14px 28px', borderRadius: '14px', fontSize: '14px', fontWeight: '800',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            >
              📄 View Detailed Report
            </button>
            <button
              onClick={handleDeployNode}
              disabled={savingNode}
              style={{
                padding: '14px 28px', borderRadius: '14px', fontSize: '14px', fontWeight: '800',
                background: 'var(--grad-btn)', border: 'none',
                color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 6px 20px rgba(56,189,248,0.25)',
                opacity: savingNode ? 0.7 : 1
              }}
              onMouseEnter={e => { if (!savingNode) e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { if (!savingNode) e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {savingNode ? 'Saving Node...' : '💾 Deploy as Node'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
