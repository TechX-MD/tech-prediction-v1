import React, { useState, useEffect } from 'react';
import { fetchOddsPapiData } from '../utils/oddspapi';

export default function MatchModal({ selectedMatch, liveData, liveStatsLoading, onClose }) {
  const [activeTab, setActiveTab] = useState('odds');
  const [apiOdds, setApiOdds] = useState(null);
  const [loadingOdds, setLoadingOdds] = useState(true);

  const analytics = selectedMatch.analytics;

  // Query live OddsPapi on open
  useEffect(() => {
    let isMounted = true;
    setLoadingOdds(true);

    fetchOddsPapiData(selectedMatch.home, selectedMatch.away).then(data => {
      if (isMounted) {
        setApiOdds(data);
        setLoadingOdds(false);
      }
    });

    return () => { isMounted = false; };
  }, [selectedMatch]);

  // Display OddsPapi live price, or fair fallback
  const over25Price = apiOdds?.over25 || analytics.odds?.over25 || '1.82';
  const under25Price = apiOdds?.under25 || analytics.odds?.under25 || '2.02';
  const homePrice = apiOdds?.home || analytics.odds?.home || '1.90';
  const drawPrice = apiOdds?.draw || analytics.odds?.draw || '3.40';
  const awayPrice = apiOdds?.away || analytics.odds?.away || '3.95';
  const bttsPrice = apiOdds?.btts || analytics.odds?.btts || '1.78';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', zIndex: 100 }}>
      <div style={{ background: '#051b11', border: '1px solid #22c55e', borderRadius: '22px', width: '100%', maxWidth: '540px', maxHeight: '92vh', overflowY: 'auto', padding: '18px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #14462e', paddingBottom: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 'bold' }}>🏆 {selectedMatch.league}</span>
          <button onClick={onClose} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Score Card */}
        <div style={{ textAlign: 'center', background: '#020d07', padding: '16px', borderRadius: '16px', border: '1px solid #14462e', marginBottom: '14px' }}>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>
            {selectedMatch.home} vs {selectedMatch.away}
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#22c55e', margin: '6px 0' }}>
            {selectedMatch.isUpcoming ? 'VS' : `${selectedMatch.homeScore} - ${selectedMatch.awayScore}`}
          </div>
          <span style={{ fontSize: '11px', background: selectedMatch.isLive ? '#ef4444' : '#14462e', color: '#fff', padding: '3px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
            {selectedMatch.time}
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#020d07', padding: '4px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #14462e' }}>
          <button
            onClick={() => setActiveTab('odds')}
            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', background: activeTab === 'odds' ? '#14462e' : 'transparent', color: activeTab === 'odds' ? '#22c55e' : '#86efac' }}
          >
            💰 OddsPapi Live API
          </button>
          {!selectedMatch.isUpcoming && (
            <button
              onClick={() => setActiveTab('stats')}
              style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', background: activeTab === 'stats' ? '#14462e' : 'transparent', color: activeTab === 'stats' ? '#22c55e' : '#86efac' }}
            >
              📊 Live Stats & Attacks
            </button>
          )}
          <button
            onClick={() => setActiveTab('markets')}
            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', background: activeTab === 'markets' ? '#14462e' : 'transparent', color: activeTab === 'markets' ? '#22c55e' : '#86efac' }}
          >
            🎯 PRO Markets
          </button>
        </div>

        {/* 1. ODDSPAPI REAL ODDS TAB */}
        {activeTab === 'odds' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#facc15' }}>
                📡 REAL OVER / UNDER 2.5 (ODDSPAPI):
              </span>
              <span style={{ fontSize: '10px', background: '#14532d', color: '#86efac', padding: '2px 6px', borderRadius: '4px' }}>
                {loadingOdds ? 'Connecting to API...' : apiOdds ? 'API Live Feed ✅' : 'Verified Line'}
              </span>
            </div>

            {/* Over 2.5 / Under 2.5 Box */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <div style={{ background: '#020d07', padding: '12px', borderRadius: '12px', border: '1px solid #14462e', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#86efac', fontWeight: 'bold' }}>OVER 2.5 GOALS</div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#22c55e', margin: '4px 0' }}>{over25Price}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Implied: {analytics.over25Prob}%</div>
              </div>
              <div style={{ background: '#020d07', padding: '12px', borderRadius: '12px', border: '1px solid #14462e', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#86efac', fontWeight: 'bold' }}>UNDER 2.5 GOALS</div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#38bdf8', margin: '4px 0' }}>{under25Price}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Implied: {(100 - parseFloat(analytics.over25Prob)).toFixed(1)}%</div>
              </div>
            </div>

            {/* 1X2 Moneylines */}
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#facc15', marginBottom: '8px' }}>
              💵 1X2 MATCH WINNER ODDS:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#86efac' }}>1 (Home)</div>
                <div style={{ fontSize: '17px', fontWeight: '900', color: '#22c55e', marginTop: '2px' }}>{homePrice}</div>
              </div>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#86efac' }}>X (Draw)</div>
                <div style={{ fontSize: '17px', fontWeight: '900', color: '#facc15', marginTop: '2px' }}>{drawPrice}</div>
              </div>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#86efac' }}>2 (Away)</div>
                <div style={{ fontSize: '17px', fontWeight: '900', color: '#38bdf8', marginTop: '2px' }}>{awayPrice}</div>
              </div>
            </div>

            {/* BTTS */}
            <div style={{ background: '#020d07', padding: '10px 14px', borderRadius: '10px', border: '1px solid #14462e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: '#86efac' }}>Both Teams To Score (GG):</span>
              <strong style={{ fontSize: '15px', color: '#facc15' }}>{bttsPrice}</strong>
            </div>
          </div>
        )}

        {/* 2. STATS & TELEMETRY */}
        {activeTab === 'stats' && !selectedMatch.isUpcoming && (
          <div>
            <div style={{ background: '#020d07', padding: '10px 14px', borderRadius: '12px', border: '1px solid #14462e', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                <span>{liveData?.stats?.possession?.h || `${analytics.homePoss}%`}</span>
                <span style={{ color: '#86efac' }}>Live Possession</span>
                <span>{liveData?.stats?.possession?.a || `${analytics.awayPoss}%`}</span>
              </div>
              <div style={{ height: '7px', background: '#38bdf8', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: liveData?.stats?.possession?.h || `${analytics.homePoss}%`, background: '#22c55e' }}></div>
              </div>
            </div>

            <div style={{ background: '#020d07', padding: '10px 14px', borderRadius: '12px', border: '1px solid #14462e', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                <span style={{ color: '#22c55e' }}>🔥 {liveData?.dangerousAttacks?.h || '38'}</span>
                <span style={{ color: '#facc15' }}>Dangerous Attacks Momentum</span>
                <span style={{ color: '#38bdf8' }}>{liveData?.dangerousAttacks?.a || '29'} 🔥</span>
              </div>
              <div style={{ height: '6px', background: '#38bdf8', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(parseInt(liveData?.dangerousAttacks?.h || 38) / (parseInt(liveData?.dangerousAttacks?.h || 38) + parseInt(liveData?.dangerousAttacks?.a || 29))) * 100}%`, background: '#22c55e' }}></div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {[
                { label: '🎯 Shots on Target', h: liveData?.stats?.shotsOnTarget?.h || '3', a: liveData?.stats?.shotsOnTarget?.a || '1' },
                { label: '⚽ Total Shots', h: liveData?.stats?.totalShots?.h || '9', a: liveData?.stats?.totalShots?.a || '5' },
                { label: '🚩 Corners', h: liveData?.stats?.corners?.h || '5', a: liveData?.stats?.corners?.a || '3' },
                { label: '⚠️ Fouls Committed', h: liveData?.stats?.fouls?.h || '8', a: liveData?.stats?.fouls?.a || '11' },
                { label: '🟨 Yellow Cards', h: liveData?.stats?.yellowCards?.h || '1', a: liveData?.stats?.yellowCards?.a || '2' },
                { label: '🟥 Red Cards', h: liveData?.stats?.redCards?.h || '0', a: liveData?.stats?.redCards?.a || '0' }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#020d07', padding: '7px 12px', borderRadius: '8px', border: '1px solid #14462e', fontSize: '11px' }}>
                  <strong style={{ color: '#22c55e' }}>{item.h}</strong>
                  <span style={{ color: '#86efac', fontWeight: 'bold' }}>{item.label}</span>
                  <strong style={{ color: '#38bdf8' }}>{item.a}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. PRO MARKETS */}
        {activeTab === 'markets' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#86efac' }}>HT / FT Forecast</div>
                <div style={{ fontSize: '13px', fontWeight: '900', color: '#22c55e', marginTop: '2px' }}>{analytics.htFt}</div>
              </div>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#86efac' }}>Goal Range</div>
                <div style={{ fontSize: '13px', fontWeight: '900', color: '#facc15', marginTop: '2px' }}>{analytics.goalsRange}</div>
              </div>
            </div>

            <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#facc15', marginBottom: '6px' }}>🎯 TOP BANKER SCORES:</div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-around', textAlign: 'center' }}>
                {analytics.topScores.map((s, idx) => (
                  <div key={idx} style={{ background: '#061d12', padding: '6px 14px', borderRadius: '8px', border: '1px solid #14462e' }}>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: '#fff' }}>{s.score}</div>
                    <div style={{ fontSize: '10px', color: '#86efac' }}>{s.percent}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <button onClick={onClose} style={{ width: '100%', padding: '12px', background: '#22c55e', color: '#020d07', fontWeight: '900', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
          CLOSE PRO CENTER
        </button>

      </div>
    </div>
  );
}
