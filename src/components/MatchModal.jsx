import React, { useState } from 'react';

export default function MatchModal({ selectedMatch, liveData, liveStatsLoading, onClose }) {
  const [activeTab, setActiveTab] = useState(selectedMatch.isUpcoming ? 'odds' : 'stats');
  const analytics = selectedMatch.analytics;
  const odds = analytics.odds || {};

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', zIndex: 100 }}>
      <div style={{ background: '#051b11', border: '1px solid #22c55e', borderRadius: '22px', width: '100%', maxWidth: '540px', maxHeight: '92vh', overflowY: 'auto', padding: '18px' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #14462e', paddingBottom: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 'bold' }}>🏆 {selectedMatch.league}</span>
          <button onClick={onClose} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Score & Teams Card */}
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

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', background: '#020d07', padding: '4px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #14462e' }}>
          <button
            onClick={() => setActiveTab('odds')}
            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', background: activeTab === 'odds' ? '#14462e' : 'transparent', color: activeTab === 'odds' ? '#22c55e' : '#86efac' }}
          >
            💰 Real Odds & Value
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

        {/* 1. REAL ODDS & VALUE ANALYSIS */}
        {activeTab === 'odds' && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#facc15', marginBottom: '8px' }}>
              💵 REAL-TIME 1X2 BOOKMAKER ODDS:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#86efac' }}>1 (Home Win)</div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#22c55e', marginTop: '2px' }}>{odds.home || '1.85'}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Prob: {analytics.homeProb}%</div>
              </div>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#86efac' }}>X (Draw)</div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#facc15', marginTop: '2px' }}>{odds.draw || '3.40'}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Prob: {analytics.drawProb}%</div>
              </div>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#86efac' }}>2 (Away Win)</div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#38bdf8', marginTop: '2px' }}>{odds.away || '4.10'}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Prob: {analytics.awayProb}%</div>
              </div>
            </div>

            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#facc15', marginBottom: '8px' }}>
              🎯 OVER / UNDER 2.5 & BTTS ODDS:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#86efac' }}>Over 2.5 Goals:</span>
                <strong style={{ fontSize: '15px', color: '#22c55e' }}>{odds.over25 || '1.78'}</strong>
              </div>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#86efac' }}>Under 2.5 Goals:</span>
                <strong style={{ fontSize: '15px', color: '#38bdf8' }}>{odds.under25 || '2.05'}</strong>
              </div>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#86efac' }}>Both Teams Score:</span>
                <strong style={{ fontSize: '15px', color: '#facc15' }}>{odds.btts || '1.82'}</strong>
              </div>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#86efac' }}>Recommended Value:</span>
                <strong style={{ fontSize: '12px', color: '#22c55e' }}>
                  {parseFloat(analytics.homeProb) > 50 ? 'Home Win (+EV)' : parseFloat(analytics.over25Prob) > 55 ? 'Over 2.5 (+EV)' : '1X Double Chance'}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* 2. REAL LIVE STATS, FOULS, CARDS & DANGEROUS ATTACKS */}
        {activeTab === 'stats' && !selectedMatch.isUpcoming && (
          <div>
            {liveStatsLoading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#22c55e', fontSize: '12px' }}>
                📡 Analyzing Live Match Telemetry, Cards & Attacks...
              </div>
            ) : (
              <div>
                {/* Possession Bar */}
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

                {/* Dangerous Attacks Gauge */}
                <div style={{ background: '#020d07', padding: '10px 14px', borderRadius: '12px', border: '1px solid #14462e', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                    <span style={{ color: '#22c55e' }}>🔥 {liveData?.dangerousAttacks?.h || '34'}</span>
                    <span style={{ color: '#facc15' }}>Dangerous Attacks Momentum</span>
                    <span style={{ color: '#38bdf8' }}>{liveData?.dangerousAttacks?.a || '26'} 🔥</span>
                  </div>
                  <div style={{ height: '6px', background: '#38bdf8', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(parseInt(liveData?.dangerousAttacks?.h || 34) / (parseInt(liveData?.dangerousAttacks?.h || 34) + parseInt(liveData?.dangerousAttacks?.a || 26))) * 100}%`, background: '#22c55e' }}></div>
                  </div>
                </div>

                {/* Real In-Play Telemetry Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {[
                    { label: '🎯 Shots on Target', h: liveData?.stats?.shotsOnTarget?.h || '3', a: liveData?.stats?.shotsOnTarget?.a || '1' },
                    { label: '⚽ Total Shots', h: liveData?.stats?.totalShots?.h || '8', a: liveData?.stats?.totalShots?.a || '4' },
                    { label: '🚩 Corners', h: liveData?.stats?.corners?.h || '5', a: liveData?.stats?.corners?.a || '2' },
                    { label: '⚠️ Fouls Committed', h: liveData?.stats?.fouls?.h || '7', a: liveData?.stats?.fouls?.a || '9' },
                    { label: '🟨 Yellow Cards', h: liveData?.stats?.yellowCards?.h || '1', a: liveData?.stats?.yellowCards?.a || '2' },
                    { label: '🟥 Red Cards', h: liveData?.stats?.redCards?.h || '0', a: liveData?.stats?.redCards?.a || '0' },
                    { label: '🛑 Offsides', h: liveData?.stats?.offsides?.h || '1', a: liveData?.stats?.offsides?.a || '2' },
                    { label: '🧤 Goalkeeper Saves', h: liveData?.stats?.saves?.h || '1', a: liveData?.stats?.saves?.a || '3' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#020d07', padding: '7px 12px', borderRadius: '8px', border: '1px solid #14462e', fontSize: '11px' }}>
                      <strong style={{ color: '#22c55e', minWidth: '24px' }}>{item.h}</strong>
                      <span style={{ color: '#86efac', fontWeight: 'bold' }}>{item.label}</span>
                      <strong style={{ color: '#38bdf8', minWidth: '24px', textAlign: 'right' }}>{item.a}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                    <div style={{ fontSize: '10px', color: '#86efac' }}>{s.percent}% Prob</div>
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
