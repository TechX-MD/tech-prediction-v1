import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

const ADMIN_EMAILS = [
  'kellyxmd01@gmail.com',
  'kellyxmd@gmail.com',
  'publicaccount660@gmail.com'
];

function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function poisson(lambda, x) {
  return (Math.exp(-lambda) * Math.pow(lambda, x)) / factorial(x);
}

function calculateFullPrediction(hXG, aXG, hCorners = 5.2, aCorners = 4.2) {
  let homeWin = 0, draw = 0, awayWin = 0, over25 = 0, btts = 0;
  let maxScoreProb = -1;
  let bankerScore = "1-1";

  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      let p = poisson(hXG, h) * poisson(aXG, a);
      if (p > maxScoreProb) {
        maxScoreProb = p;
        bankerScore = `${h}-${a}`;
      }
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;

      if (h + a > 2.5) over25 += p;
      if (h > 0 && a > 0) btts += p;
    }
  }

  const totalExpCorners = (hCorners + aCorners).toFixed(1);
  const cornerLine = totalExpCorners > 9.0 ? "O 9.5" : "O 8.5";
  const cornerProb = ((1 - poisson(totalExpCorners, 0) - poisson(totalExpCorners, 1)) * 52).toFixed(0);

  const maxWinProb = Math.max(homeWin, awayWin);
  const confidence = Math.min(92, Math.max(48, Math.round(maxWinProb * 100 + (over25 * 15))));

  let mainTip = "1X";
  let straightWin = "HOME WIN";
  if (homeWin > awayWin && homeWin > 0.45) {
    mainTip = "HOME TO WIN + OVER 1.5";
    straightWin = "HOME WIN";
  } else if (awayWin > homeWin && awayWin > 0.40) {
    mainTip = "AWAY TO WIN + OVER 1.5";
    straightWin = "AWAY WIN";
  } else {
    mainTip = "BTTS (YES) + OVER 2.5";
    straightWin = "DOUBLE CHANCE";
  }

  return {
    homeProb: (homeWin * 100).toFixed(1),
    drawProb: (draw * 100).toFixed(1),
    awayProb: (awayWin * 100).toFixed(1),
    over25Prob: (over25 * 100).toFixed(1),
    bttsProb: (btts * 100).toFixed(0),
    bankerScore,
    totalExpCorners,
    cornerLine,
    cornerProb,
    confidence,
    mainTip,
    straightWin,
    rawEdge: Math.round(Math.abs(homeWin - awayWin) * 100 + 20)
  };
}

const INITIAL_FIXTURES = [
  {
    id: 'f1',
    date: '2025-05-10',
    time: '16:00',
    league: 'Premier League',
    home: 'Arsenal',
    away: 'Chelsea',
    hXG: 2.15,
    aXG: 1.25,
    hCorners: 6.2,
    aCorners: 4.1,
    isVip: true
  },
  {
    id: 'f2',
    date: '2025-05-10',
    time: '20:00',
    league: 'La Liga',
    home: 'Real Madrid',
    away: 'Barcelona',
    hXG: 2.45,
    aXG: 2.10,
    hCorners: 5.8,
    aCorners: 5.4,
    isVip: true
  },
  {
    id: 'f3',
    date: '2025-05-10',
    time: '18:30',
    league: 'Serie A',
    home: 'Inter Milan',
    away: 'Juventus',
    hXG: 1.70,
    aXG: 1.10,
    hCorners: 5.1,
    aCorners: 3.8,
    isVip: false
  },
  {
    id: 'f4',
    date: '2025-05-11',
    time: '15:00',
    league: 'Premier League',
    home: 'Liverpool',
    away: 'Man City',
    hXG: 2.20,
    aXG: 2.05,
    hCorners: 6.5,
    aCorners: 6.1,
    isVip: true
  }
];

export default function App() {
  const [session, setSession] = useState(null);
  const [currentTab, setCurrentTab] = useState('Matches');
  const [selectedDate, setSelectedDate] = useState('2025-05-10');
  const [fixtures, setFixtures] = useState(INITIAL_FIXTURES);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMsg, setAuthMsg] = useState('');
  const [isVipSubscribed, setIsVipSubscribed] = useState(false);

  const [newMatch, setNewMatch] = useState({
    league: 'Premier League',
    home: '',
    away: '',
    date: '2025-05-10',
    time: '18:00',
    hXG: 1.8,
    aXG: 1.2,
    isVip: true
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const userEmail = session?.user?.email || '';
  const isAdmin = ADMIN_EMAILS.includes(userEmail.toLowerCase());
  const hasVipAccess = isAdmin || isVipSubscribed;

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };

  const handleAuth = async (isSignUp) => {
    setAuthMsg('Processing...');
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthMsg(error.message);
    } else if (isSignUp) {
      setAuthMsg('Account created! Now click Log In.');
    }
  };

  const handleAddFixture = (e) => {
    e.preventDefault();
    if (!newMatch.home || !newMatch.away) return alert('Enter team names!');
    const item = {
      ...newMatch,
      id: 'fix_' + Date.now(),
      hXG: parseFloat(newMatch.hXG),
      aXG: parseFloat(newMatch.aXG),
      hCorners: 5.0,
      aCorners: 4.0
    };
    setFixtures([item, ...fixtures]);
    alert('Match added successfully!');
    setNewMatch({ league: 'Premier League', home: '', away: '', date: selectedDate, time: '18:00', hXG: 1.8, aXG: 1.2, isVip: true });
  };

  const filteredMatches = fixtures.filter(f => f.date === selectedDate);
  const vipMatches = fixtures.filter(f => f.isVip);

  return (
    <div style={{ backgroundColor: '#04130c', color: '#e2e8f0', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ padding: '24px 16px 12px', textAlign: 'center', maxWidth: '650px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase', margin: '0 0 4px' }}>
          WELCOME TO <span style={{ color: '#22c55e' }}>TECH PREDICTION SLY HUB</span>
        </h1>
        <p style={{ fontSize: '13px', color: '#86efac', margin: 0, opacity: 0.85 }}>
          Poisson-driven predictions for correct score, goals, corners and both teams to score.
        </p>

        {session && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', background: '#082317', padding: '8px 14px', borderRadius: '12px', border: '1px solid #14462e' }}>
            <span style={{ fontSize: '12px', color: '#86efac' }}>
              👤 {userEmail} {isAdmin ? <strong style={{ color: '#facc15' }}>(OWNER / ADMIN)</strong> : ''}
            </span>
            <button onClick={() => supabase.auth.signOut()} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
              Sign Out
            </button>
          </div>
        )}
      </header>

      <main style={{ maxWidth: '650px', margin: '0 auto', padding: '12px 16px 80px' }}>
        {!session ? (
          <div style={{ background: '#082317', padding: '24px', borderRadius: '16px', border: '1px solid #14462e', marginTop: '20px' }}>
            <h2 style={{ textAlign: 'center', fontSize: '18px', color: '#fff', marginBottom: '16px' }}>Sign in to View Live Engine</h2>
            
            <button onClick={handleGoogleLogin} style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '16px' }}>
              Continue with Google
            </button>
            
            <div style={{ textAlign: 'center', color: '#4ade80', fontSize: '11px', marginBottom: '12px' }}>OR USE EMAIL & PASSWORD</div>
            
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '92%', padding: '12px', marginBottom: '10px', background: '#04130c', border: '1px solid #1b5e3d', color: '#fff', borderRadius: '8px' }} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '92%', padding: '12px', marginBottom: '12px', background: '#04130c', border: '1px solid #1b5e3d', color: '#fff', borderRadius: '8px' }} />
            
            {authMsg && <div style={{ color: '#facc15', fontSize: '12px', textAlign: 'center', marginBottom: '10px' }}>{authMsg}</div>}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleAuth(false)} style={{ flex: 1, padding: '12px', background: '#22c55e', color: '#04130c', fontWeight: 'bold', border: 'none', borderRadius: '8px' }}>Log In</button>
              <button onClick={() => handleAuth(true)} style={{ flex: 1, padding: '12px', background: '#0f3824', color: '#fff', border: '1px solid #22c55e', borderRadius: '8px' }}>Sign Up</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', background: '#082317', padding: '4px', borderRadius: '12px', margin: '16px 0', border: '1px solid #14462e' }}>
              {['Matches', 'Predictor', 'VIP', ...(isAdmin ? ['Admin'] : [])].map(tab => (
                <button
                  key={tab}
                  onClick={() => setCurrentTab(tab)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer',
                    background: currentTab === tab ? '#14462e' : 'transparent',
                    color: currentTab === tab ? (tab === 'VIP' ? '#facc15' : '#22c55e') : '#86efac',
                    transition: '0.2s'
                  }}
                >
                  {tab === 'VIP' ? '👑 VIP' : tab}
                </button>
              ))}
            </div>

            {currentTab === 'Matches' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#082317', padding: '12px', borderRadius: '12px', border: '1px solid #14462e', marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#86efac', fontWeight: 'bold' }}>📅 Match Calendar:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    style={{ background: '#04130c', color: '#22c55e', border: '1px solid #14462e', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold' }}
                  />
                </div>

                {filteredMatches.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#6ee7b7' }}>Hapana mamatch pazuva iri ({selectedDate}). Chinja zuva riri pamusoro.</div>
                ) : (
                  filteredMatches.map(m => {
                    const pred = calculateFullPrediction(m.hXG, m.aXG, m.hCorners, m.aCorners);
                    return (
                      <div key={m.id} style={{ background: '#082317', border: '1px solid #14462e', borderRadius: '16px', padding: '16px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#86efac', fontWeight: 'bold', marginBottom: '8px' }}>
                          <span>🏆 {m.league}</span>
                          <span>⏰ {m.time}</span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900', color: '#fff', margin: '8px 0 14px' }}>
                          <span>{m.home}</span>
                          <span style={{ color: '#22c55e', fontSize: '12px', background: '#04130c', padding: '2px 8px', borderRadius: '6px' }}>VS</span>
                          <span>{m.away}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#04130c', padding: '10px', borderRadius: '10px', textAlign: 'center', marginBottom: '12px' }}>
                          <div>
                            <div style={{ fontSize: '10px', color: '#86efac' }}>1 (Home)</div>
                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#22c55e' }}>{pred.homeProb}%</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: '#86efac' }}>X (Draw)</div>
                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#facc15' }}>{pred.drawProb}%</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: '#86efac' }}>2 (Away)</div>
                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#38bdf8' }}>{pred.awayProb}%</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ color: '#86efac' }}>Over 2.5: <strong>{pred.over25Prob}%</strong></span>
                          <span style={{ background: '#22c55e', color: '#04130c', padding: '4px 10px', borderRadius: '6px', fontWeight: '900' }}>
                            Pick: {pred.mainTip}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {currentTab === 'VIP' && (
              <div>
                {!hasVipAccess ? (
                  <div style={{ background: '#082317', border: '2px solid #eab308', borderRadius: '20px', padding: '30px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</div>
                    <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#facc15', margin: '0 0 8px' }}>VIP MEMBERSHIP LOCKED</h2>
                    <p style={{ fontSize: '13px', color: '#86efac', lineHeight: '1.5', marginBottom: '20px' }}>
                      Kuti uwane ma VIP Banker Scores (100% Poisson Edge, Exact Corners, & High Odds), unofanira kubhadhara $5/Week.
                    </p>
                    <div style={{ background: '#04130c', padding: '14px', borderRadius: '12px', border: '1px solid #14462e', textAlign: 'left', marginBottom: '20px' }}>
                      <div style={{ fontSize: '12px', color: '#facc15', fontWeight: 'bold' }}>PAYMENT OPTIONS (EcoCash / Innbucks / Mukuru):</div>
                      <div style={{ fontSize: '13px', color: '#fff', marginTop: '4px' }}>📱 Send to: <strong>+263 78 775 8730</strong></div>
                      <div style={{ fontSize: '11px', color: '#86efac', marginTop: '4px' }}>Wabhadhara, tumira screenshot kuna Admin wovhurirwa ipapo ipapo.</div>
                    </div>
                    <button onClick={() => setIsVipSubscribed(true)} style={{ background: '#eab308', color: '#04130c', padding: '12px 24px', borderRadius: '10px', fontWeight: '900', border: 'none', cursor: 'pointer' }}>
                      I HAVE PAID (ACTIVATE)
                    </button>
                  </div>
                ) : (
                  <div>
                    {vipMatches.map(m => {
                      const pred = calculateFullPrediction(m.hXG, m.aXG, m.hCorners, m.aCorners);
                      return (
                        <div key={m.id} style={{ marginBottom: '20px' }}>
                          <div style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
                            borderRadius: '24px',
                            padding: '24px 20px',
                            color: '#ffffff',
                            boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)',
                            marginBottom: '12px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '22px', marginBottom: '8px' }}>
                              👑
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
                              VIP STRAIGHT WIN
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', margin: '4px 0 10px', opacity: 0.95 }}>
                              {m.home} vs {m.away}
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '900', lineHeight: '1.2', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {m.home.toUpperCase()} TO WIN + OVER 2.5 GOALS
                            </div>
                            <div style={{ fontSize: '12px', marginTop: '12px', opacity: 0.9 }}>
                              Model xG {m.hXG} - {m.aXG} with {pred.rawEdge}% raw edge on the straight result.
                            </div>
                          </div>

                          <div style={{ background: '#082317', border: '1px solid #14462e', borderRadius: '16px', padding: '16px', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#22c55e', fontWeight: 'bold', textTransform: 'uppercase' }}>
                              🛡️ CONFIDENCE
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', marginTop: '4px' }}>
                              {pred.confidence}%
                            </div>
                          </div>

                          <div style={{ background: '#082317', border: '1px solid #14462e', borderRadius: '16px', padding: '16px', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#22c55e', fontWeight: 'bold', textTransform: 'uppercase' }}>
                              🎯 BANKER SCORE
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff', margin: '4px 0' }}>
                              {pred.bankerScore}
                            </div>
                            <div style={{ fontSize: '12px', color: '#86efac', fontWeight: 'bold' }}>
                              BTTS {pred.bttsProb}%
                            </div>
                          </div>

                          <div style={{ background: '#082317', border: '1px solid #14462e', borderRadius: '16px', padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#22c55e', fontWeight: 'bold', textTransform: 'uppercase' }}>
                              🚩 CORNER LINE
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff', margin: '4px 0' }}>
                              {pred.cornerLine}
                            </div>
                            <div style={{ fontSize: '12px', color: '#86efac' }}>
                              {pred.totalExpCorners} expected · {pred.cornerLine} {pred.cornerProb}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {currentTab === 'Predictor' && (
              <div style={{ background: '#082317', border: '1px solid #14462e', borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#22c55e', marginBottom: '12px' }}>🧮 Custom Poisson Match Simulator</h3>
                <p style={{ fontSize: '12px', color: '#86efac', marginBottom: '16px' }}>Isa xG yemaTeams maviri kuti algorithm ikupe Banker Score ne Corners.</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#86efac' }}>Home Team xG:</label>
                    <input type="number" step="0.1" defaultValue="2.1" id="customHXG" style={{ width: '85%', padding: '10px', background: '#04130c', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#86efac' }}>Away Team xG:</label>
                    <input type="number" step="0.1" defaultValue="1.3" id="customAXG" style={{ width: '85%', padding: '10px', background: '#04130c', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
                  </div>
                </div>

                <button onClick={() => {
                  const h = parseFloat(document.getElementById('customHXG').value) || 1.8;
                  const a = parseFloat(document.getElementById('customAXG').value) || 1.2;
                  const res = calculateFullPrediction(h, a);
                  alert(`Simulation Results:\n- Banker Score: ${res.bankerScore}\n- Home Win: ${res.homeProb}%\n- Over 2.5: ${res.over25Prob}%\n- Corners: ${res.cornerLine} (${res.totalExpCorners} expected)`);
                }} style={{ width: '100%', padding: '12px', background: '#22c55e', color: '#04130c', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                  Run Simulation
                </button>
              </div>
            )}

            {currentTab === 'Admin' && isAdmin && (
              <div style={{ background: '#082317', border: '2px solid #22c55e', borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#22c55e', marginBottom: '6px' }}>👑 Owner / Admin Control Room</h3>
                <p style={{ fontSize: '12px', color: '#86efac', marginBottom: '16px' }}>Wedzera real matches matsva nema VIP picks pano.</p>

                <form onSubmit={handleAddFixture} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" placeholder="League" value={newMatch.league} onChange={e => setNewMatch({ ...newMatch, league: e.target.value })} style={{ padding: '10px', background: '#04130c', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="text" placeholder="Home Team" value={newMatch.home} onChange={e => setNewMatch({ ...newMatch, home: e.target.value })} style={{ padding: '10px', background: '#04130c', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
                    <input type="text" placeholder="Away Team" value={newMatch.away} onChange={e => setNewMatch({ ...newMatch, away: e.target.value })} style={{ padding: '10px', background: '#04130c', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="date" value={newMatch.date} onChange={e => setNewMatch({ ...newMatch, date: e.target.value })} style={{ padding: '10px', background: '#04130c', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
                    <input type="time" value={newMatch.time} onChange={e => setNewMatch({ ...newMatch, time: e.target.value })} style={{ padding: '10px', background: '#04130c', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="number" step="0.1" placeholder="Home xG" value={newMatch.hXG} onChange={e => setNewMatch({ ...newMatch, hXG: e.target.value })} style={{ padding: '10px', background: '#04130c', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
                    <input type="number" step="0.1" placeholder="Away xG" value={newMatch.aXG} onChange={e => setNewMatch({ ...newMatch, aXG: e.target.value })} style={{ padding: '10px', background: '#04130c', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#facc15', fontSize: '13px' }}>
                    <input type="checkbox" checked={newMatch.isVip} onChange={e => setNewMatch({ ...newMatch, isVip: e.target.checked })} />
                    Is this a VIP Straight Win match?
                  </label>

                  <button type="submit" style={{ padding: '12px', background: '#22c55e', color: '#04130c', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', marginTop: '6px' }}>
                    + Add Match to System
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
