import React, { useState } from 'react';

export default function MatchModal({ selectedMatch, liveData, liveStatsLoading, onClose }) {
  const [activeTab, setActiveTab] = useState(selectedMatch.isUpcoming ? 'markets' : 'stats');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', zIndex: 100 }}>
      <div style={{ background: '#051b11', border: '1px solid #22c55e', borderRadius: '22px', width: '100%', maxWidth: '540px', maxHeight: '92vh', overflowY: 'auto', padding: '18px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #14462e', paddingBottom: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 'bold' }}>🏆 {selectedMatch.league}</span>
          <button onClick={onClose} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
        </div>

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

        <div style={{ display: 'flex', background: '#020d07', padding: '4px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #14462e' }}>
          {!selectedMatch.isUpcoming && (
            <button onClick={() => setActiveTab('stats')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', background: activeTab === 'stats' ? '#14462e' : 'transparent', color: activeTab === 'stats' ? '#22c55e' : '#86efac' }}>
              📊 Match Stats
            </button>
          )}
          <button onClick={() => setActiveTab('markets')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', background: activeTab === 'markets' ? '#14462e' : 'transparent', color: activeTab === 'markets' ? '#22c55e' : '#86efac' }}>
            🎯 PRO Markets
          </button>
        </div>

        {activeTab === 'stats' && !selectedMatch.isUpcoming && (
          <div>
            {liveStatsLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#22c55e', fontSize: '12px' }}>📡 Fetching In-Play SOT, Cards & Attacks...</div>
            ) : (
              <div>
                <div style={{ background: '#020d07', padding: '10px 14px', borderRadius: '12px', border: '1px solid #14462e', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                    <span>{liveData?.stats?.possession?.h || `${selectedMatch.analytics.homePoss}%`}</span>
                    <span style={{ color: '#86efac' }}>Possession</span>
                    <span>{liveData?.stats?.possession?.a || `${selectedMatch.analytics.awayPoss}%`}</span>
                  </div>
                  <div style={{ height: '7px', background: '#38bdf8', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: liveData?.stats?.possession?.h || `${selectedMatch.analytics.homePoss}%`, background: '#22c55e' }}></div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {[
                    { label: '🎯 Shots on Target', h: liveData?.stats?.shotsOnTarget?.h || '0', a: liveData?.stats?.shotsOnTarget?.a || '0' },
                    { label: '⚽ Total Shots', h: liveData?.stats?.totalShots?.h || '0', a: liveData?.stats?.totalShots?.a || '0' },
                    { label: '🚩 Corners', h: liveData?.stats?.corners?.h || '0', a: liveData?.stats?.corners?.a || '0' },
                    { label: '🔥 Dangerous Attacks', h: liveData?.dangerousAttacks?.h || '0', a: liveData?.dangerousAttacks?.a || '0' },
                    { label: '⚠️ Fouls Committed', h: liveData?.stats?.fouls?.h || '0', a: liveData?.stats?.fouls?.a || '0' },
                    { label: '🟨 Yellow Cards', h: liveData?.stats?.yellowCards?.h || '0', a: liveData?.stats?.yellowCards?.a || '0' }
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
          </div>
        )}

        {activeTab === 'markets' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#86efac' }}>HT / FT Forecast</div>
                <div style={{ fontSize: '13px', fontWeight: '900', color: '#22c55e', marginTop: '2px' }}>{selectedMatch.analytics.htFt}</div>
              </div>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#86efac' }}>Goal Range</div>
                <div style={{ fontSize: '13px', fontWeight: '900', color: '#facc15', marginTop: '2px' }}>{selectedMatch.analytics.goalsRange}</div>
              </div>
            </div>

            <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#facc15', marginBottom: '6px' }}>📊 OVER / UNDER MARKETS:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#061d12', padding: '5px 8px', borderRadius: '6px' }}>
                  <span>Over 1.5:</span> <strong style={{ color: '#22c55e' }}>{selectedMatch.analytics.over15Prob}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#061d12', padding: '5px 8px', borderRadius: '6px' }}>
                  <span>Over 2.5:</span> <strong style={{ color: '#22c55e' }}>{selectedMatch.analytics.over25Prob}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#061d12', padding: '5px 8px', borderRadius: '6px' }}>
                  <span>BTTS (GG):</span> <strong style={{ color: '#facc15' }}>{selectedMatch.analytics.bttsProb}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#061d12', padding: '5px 8px', borderRadius: '6px' }}>
                  <span>Under 2.5:</span> <strong style={{ color: '#38bdf8' }}>{(100 - selectedMatch.analytics.over25Prob).toFixed(1)}%</strong>
                </div>
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
