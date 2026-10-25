import React, { useState } from 'react';

export default function VipSection({ hasVipAccess, matches, onSubmitAirtime, paymentSentMsg }) {
  const [network, setNetwork] = useState('Econet');
  const [senderPhone, setSenderPhone] = useState('');
  const [airtimePin, setAirtimePin] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!airtimePin || !senderPhone) return alert('Pinda Phone Number ne PIN ye Airtime!');
    onSubmitAirtime(network, senderPhone, airtimePin);
    setAirtimePin('');
    setSenderPhone('');
  };

  if (!hasVipAccess) {
    return (
      <div style={{ background: '#061d12', border: '2px solid #eab308', borderRadius: '20px', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>👑</div>
          <h2 style={{ fontSize: '19px', fontWeight: '900', color: '#facc15', margin: '0 0 6px' }}>TECH TV PRO VIP ACCESS</h2>
          <p style={{ fontSize: '12px', color: '#86efac', marginBottom: '16px' }}>
            Tenga VIP Access uchishandisa <strong>Econet kana NetOne Airtime</strong> kuti uwane High Edge Banker Acca, Exact Corners & Cards!
          </p>
        </div>

        <div style={{ background: '#020d07', padding: '14px', borderRadius: '12px', border: '1px solid #14462e', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#facc15', marginBottom: '8px' }}>AIRTIME RECHARGE NUMBERS:</div>
          <div style={{ fontSize: '13px', color: '#fff', marginBottom: '6px' }}>
            🟢 <strong>NetOne:</strong> <span style={{ color: '#22c55e', fontWeight: '900' }}>+263 716 616 101</span>
          </div>
          <div style={{ fontSize: '13px', color: '#fff' }}>
            🔵 <strong>Econet:</strong> <span style={{ color: '#38bdf8', fontWeight: '900' }}>+263 779 411 538</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <select value={network} onChange={e => setNetwork(e.target.value)} style={{ width: '100%', padding: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }}>
            <option value="Econet">Econet (+263779411538)</option>
            <option value="NetOne">NetOne (+263716616101)</option>
          </select>

          <input type="text" placeholder="Phone Number (e.g. 0771234567)" required value={senderPhone} onChange={e => setSenderPhone(e.target.value)} style={{ width: '92%', padding: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />

          <input type="text" placeholder="Airtime Recharge PIN / Voucher Code" required value={airtimePin} onChange={e => setAirtimePin(e.target.value)} style={{ width: '92%', padding: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />

          {paymentSentMsg && (
            <div style={{ background: '#14532d', color: '#86efac', padding: '10px', borderRadius: '8px', fontSize: '12px', textAlign: 'center' }}>
              ✅ Airtime payment submitted! Admin ari ku-activater VIP yako izvozvi.
            </div>
          )}

          <button type="submit" style={{ padding: '12px', background: '#eab308', color: '#020d07', fontWeight: '900', borderRadius: '10px', border: 'none', cursor: 'pointer', marginTop: '6px' }}>
            SUBMIT AIRTIME FOR INSTANT VIP
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      {matches.slice(0, 4).map(m => (
        <div key={m.id} style={{ marginBottom: '18px' }}>
          <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)', borderRadius: '20px', padding: '20px', color: '#fff', marginBottom: '10px' }}>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>👑</div>
            <div style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '1px' }}>PRO VIP STRAIGHT WIN + ACCA</div>
            <div style={{ fontSize: '12px', margin: '2px 0 8px' }}>{m.home} vs {m.away}</div>
            <div style={{ fontSize: '22px', fontWeight: '900' }}>{m.home.toUpperCase()} TO WIN + OVER 2.5</div>
            <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.9 }}>HT/FT: {m.analytics.htFt} | Multi-Goals: {m.analytics.goalsRange}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div style={{ background: '#061d12', border: '1px solid #14462e', borderRadius: '12px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 'bold' }}>🎯 BANKER SCORE</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff' }}>{m.analytics.topScores[0]?.score}</div>
              <div style={{ fontSize: '10px', color: '#86efac' }}>BTTS: {m.analytics.bttsProb}%</div>
            </div>
            <div style={{ background: '#061d12', border: '1px solid #14462e', borderRadius: '12px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 'bold' }}>🚩 CORNERS & CARDS</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff', marginTop: '4px' }}>{m.analytics.cornerLine}</div>
              <div style={{ fontSize: '10px', color: '#facc15' }}>{m.analytics.cardsLine}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
