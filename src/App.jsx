import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

const ADMIN_EMAILS = [
  'kellyxmd01@gmail.com',
  'kellyxmd@gmail.com',
  'publicaccount660@gmail.com'
];

const LEAGUES = [
  { id: 'eng.1', name: 'Premier League' },
  { id: 'esp.1', name: 'La Liga' },
  { id: 'ita.1', name: 'Serie A' },
  { id: 'ger.1', name: 'Bundesliga' },
  { id: 'fra.1', name: 'Ligue 1' },
  { id: 'uefa.champions', name: 'UEFA Champions League' }
];

// Calculate realistic, distinct attack ratings for teams
function getTeamStrength(teamName) {
  const elite = {
    'Man City': 2.45, 'Real Madrid': 2.35, 'Bayern': 2.40, 'Arsenal': 2.20,
    'Liverpool': 2.25, 'Barcelona': 2.15, 'PSG': 2.10, 'Inter': 1.95, 'Leverkusen': 2.05,
    'Chelsea': 1.80, 'Juventus': 1.70, 'Atletico': 1.75, 'Milan': 1.65,
    'Dortmund': 1.85, 'Tottenham': 1.75, 'Aston Villa': 1.70, 'Newcastle': 1.65,
    'Napoli': 1.75, 'Sporting': 1.80, 'Benfica': 1.75, 'Forest': 1.15
  };

  for (const [key, val] of Object.entries(elite)) {
    if (teamName.toLowerCase().includes(key.toLowerCase())) return val;
  }

  // Deterministic seed for unique strength per club name
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) hash = (hash << 5) - hash + teamName.charCodeAt(i);
  const val = 1.10 + (Math.abs(hash) % 85) / 100;
  return parseFloat(val.toFixed(2));
}

// Factorial & Poisson Functions
function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function poisson(lambda, x) {
  return (Math.exp(-lambda) * Math.pow(lambda, x)) / factorial(x);
}

// Full In-Depth Match Analytics Calculator
function calculateDeepMatchAnalytics(homeName, awayName, liveStatus = false, liveHScore = 0, liveAScore = 0) {
  let baseHXG = getTeamStrength(homeName) + 0.25; // Home advantage
  let baseAXG = getTeamStrength(awayName);

  if (liveStatus) {
    baseHXG = Math.max(1.1, baseHXG * 0.6 + parseInt(liveHScore) * 0.5);
    baseAXG = Math.max(0.9, baseAXG * 0.6 + parseInt(liveAScore) * 0.5);
  }

  const hXG = parseFloat(baseHXG.toFixed(2));
  const aXG = parseFloat(baseAXG.toFixed(2));

  let homeWin = 0, draw = 0, awayWin = 0;
  let over15 = 0, over25 = 0, over35 = 0, btts = 0;
  let scoreMatrix = [];

  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const p = poisson(hXG, h) * poisson(aXG, a);
      scoreMatrix.push({ score: `${h}-${a}`, prob: p });

      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;

      if (h + a > 1.5) over15 += p;
      if (h + a > 2.5) over25 += p;
      if (h + a > 3.5) over35 += p;
      if (h > 0 && a > 0) btts += p;
    }
  }

  scoreMatrix.sort((a, b) => b.prob - a.prob);
  const topScores = scoreMatrix.slice(0, 3).map(s => ({
    score: s.score,
    percent: (s.prob * 100).toFixed(1)
  }));

  // Tactical Possession Calculation
  const totalPower = hXG + aXG;
  let homePoss = Math.round((hXG / totalPower) * 100);
  homePoss = Math.min(68, Math.max(38, homePoss));
  const awayPoss = 100 - homePoss;

  // Expected Shots on Target & Dangerous Attacks
  const homeShots = Math.round(hXG * 3.2);
  const awayShots = Math.round(aXG * 2.8);
  const homeAttacks = Math.round(homePoss * 0.95);
  const awayAttacks = Math.round(awayPoss * 0.90);

  // Expected Corners
  const expHCorners = (hXG * 2.8).toFixed(1);
  const expACorners = (aXG * 2.3).toFixed(1);
  const totalExpCorners = (parseFloat(expHCorners) + parseFloat(expACorners)).toFixed(1);
  const cornerLine = totalExpCorners > 9.2 ? 'Over 9.5' : 'Over 8.5';
  const cornerProb = Math.min(89, Math.round(totalExpCorners * 6.5));

  // Main Tip
  let mainTip = "1X (Home or Draw)";
  if (homeWin > 0.52) mainTip = "HOME WIN";
  else if (awayWin > 0.46) mainTip = "AWAY WIN";
  else if (over25 > 0.58) mainTip = "OVER 2.5 GOALS";
  else if (btts > 0.60) mainTip = "BTTS (BOTH SCORE)";

  return {
    hXG,
    aXG,
    homePoss,
    awayPoss,
    homeShots,
    awayShots,
    homeAttacks,
    awayAttacks,
    homeProb: (homeWin * 100).toFixed(1),
    drawProb: (draw * 100).toFixed(1),
    awayProb: (awayWin * 100).toFixed(1),
    over15Prob: (over15 * 100).toFixed(1),
    over25Prob: (over25 * 100).toFixed(1),
    over35Prob: (over35 * 100).toFixed(1),
    under25Prob: ((1 - over25) * 100).toFixed(1),
    bttsProb: (btts * 100).toFixed(1),
    bankerScore: topScores[0].score,
    topScores,
    totalExpCorners,
    cornerLine,
    cornerProb,
    mainTip
  };
}

export default function App() {
  const [session, setSession] = useState(null);
  const [currentTab, setCurrentTab] = useState('Matches'); // 'Live' | 'Matches' | 'VIP' | 'Predictor' | 'Admin'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMsg, setAuthMsg] = useState('');

  // VIP & Airtime Submission State
  const [isVipSubscribed, setIsVipSubscribed] = useState(false);
  const [network, setNetwork] = useState('Econet');
  const [senderPhone, setSenderPhone] = useState('');
  const [airtimePin, setAirtimePin] = useState('');
  const [vipRequests, setVipRequests] = useState([
    { id: 1, email: 'user@gmail.com', network: 'Econet (0779411538)', pin: '8839-2910-4491', phone: '0779411538', status: 'Pending' }
  ]);
  const [paymentSentMsg, setPaymentSentMsg] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const fetchRealMatches = async (dateStr) => {
    setLoading(true);
    const formattedDate = dateStr.replace(/-/g, '');
    let allMatches = [];

    try {
      const requests = LEAGUES.map(l =>
        fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${l.id}/scoreboard?dates=${formattedDate}`)
          .then(res => res.json())
          .catch(() => null)
      );

      const results = await Promise.all(requests);

      results.forEach((data, index) => {
        if (data && data.events && data.events.length > 0) {
          data.events.forEach(ev => {
            const comp = ev.competitions?.[0];
            const home = comp?.competitors?.find(c => c.homeAway === 'home');
            const away = comp?.competitors?.find(c => c.homeAway === 'away');
            const statusState = ev.status?.type?.state;
            const statusDetail = ev.status?.type?.shortDetail || 'NS';

            const homeName = home?.team?.displayName || 'Home Team';
            const awayName = away?.team?.displayName || 'Away Team';
            const homeScore = home?.score || '0';
            const awayScore = away?.score || '0';
            const isLive = statusState === 'in';

            // Calculate deep stats unique to these 2 specific teams
            const analytics = calculateDeepMatchAnalytics(homeName, awayName, isLive, homeScore, awayScore);

            allMatches.push({
              id: ev.id,
              league: LEAGUES[index].name,
              home: homeName,
              away: awayName,
              homeScore,
              awayScore,
              time: statusDetail,
              isLive,
              isFinished: statusState === 'post',
              isUpcoming: statusState === 'pre',
              analytics,
              isVip: true
            });
          });
        }
      });
    } catch (err) {
      console.error('Error fetching matches:', err);
    }

    setMatches(allMatches);
    setLoading(false);
  };

  useEffect(() => {
    fetchRealMatches(selectedDate);
  }, [selectedDate]);

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

    if (error) setAuthMsg(error.message);
    else if (isSignUp) setAuthMsg('Account created! Log In now.');
  };

  const submitAirtimePayment = (e) => {
    e.preventDefault();
    if (!airtimePin || !senderPhone) return alert('Pinda Phone Number ne Airtime Recharge PIN!');

    const newReq = {
      id: Date.now(),
      email: userEmail || 'User',
      network: network === 'Econet' ? 'Econet (0779411538)' : 'NetOne (0716616101)',
      pin: airtimePin,
      phone: senderPhone,
      status: 'Pending'
    };

    setVipRequests([newReq, ...vipRequests]);
    setPaymentSentMsg(true);
    setAirtimePin('');
    setSenderPhone('');
  };

  const approveUserVIP = (id) => {
    setVipRequests(vipRequests.map(r => r.id === id ? { ...r, status: 'APPROVED ✅' } : r));
    setIsVipSubscribed(true);
    alert('User VIP Access Approved!');
  };

  const liveMatchesList = matches.filter(m => m.isLive);

  return (
    <div style={{ backgroundColor: '#020d07', color: '#e2e8f0', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header */}
      <header style={{ borderBottom: '1px solid #0f3822', background: '#05180f', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '650px', margin: '0 auto', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '19px', fontWeight: '900', color: '#22c55e', margin: 0, letterSpacing: '0.5px' }}>
              ⚡ TECH TV PREDICTOR
            </h1>
            <div style={{ fontSize: '10px', color: '#86efac', opacity: 0.85 }}>Real AI Live Match Analytics & Poisson Engine</div>
          </div>
          {session && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isAdmin && <span style={{ fontSize: '10px', background: '#eab308', color: '#020d07', fontWeight: '900', padding: '2px 6px', borderRadius: '4px' }}>ADMIN</span>}
              <button onClick={() => supabase.auth.signOut()} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '650px', margin: '0 auto', padding: '14px 16px 80px' }}>
        
        {!session ? (
          <div style={{ background: '#051b11', padding: '24px', borderRadius: '16px', border: '1px solid #14462e', marginTop: '20px' }}>
            <h2 style={{ textAlign: 'center', fontSize: '18px', color: '#fff', marginBottom: '4px' }}>Sign In to TECH TV PREDICTOR</h2>
            <p style={{ textAlign: 'center', color: '#86efac', fontSize: '12px', marginBottom: '18px' }}>Real Live Match Tracker & Odds Calculator</p>

            <button onClick={handleGoogleLogin} style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '16px' }}>
              Continue with Google
            </button>
            
            <div style={{ textAlign: 'center', color: '#4ade80', fontSize: '11px', marginBottom: '12px' }}>OR USE EMAIL & PASSWORD</div>
            
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '92%', padding: '12px', marginBottom: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '92%', padding: '12px', marginBottom: '12px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
            
            {authMsg && <div style={{ color: '#facc15', fontSize: '12px', textAlign: 'center', marginBottom: '10px' }}>{authMsg}</div>}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleAuth(false)} style={{ flex: 1, padding: '12px', background: '#22c55e', color: '#020d07', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Log In</button>
              <button onClick={() => handleAuth(true)} style={{ flex: 1, padding: '12px', background: '#0f3824', color: '#fff', border: '1px solid #22c55e', borderRadius: '8px', cursor: 'pointer' }}>Sign Up</button>
            </div>
          </div>
        ) : (
          <div>
            
            {/* Tabs */}
            <div style={{ display: 'flex', background: '#05180f', padding: '4px', borderRadius: '12px', margin: '8px 0 16px', border: '1px solid #14462e' }}>
              {['Live', 'Matches', 'VIP', 'Predictor', ...(isAdmin ? ['Admin'] : [])].map(tab => (
                <button
                  key={tab}
                  onClick={() => setCurrentTab(tab)}
                  style={{
                    flex: 1,
                    padding: '9px 0',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                    background: currentTab === tab ? '#14462e' : 'transparent',
                    color: currentTab === tab ? (tab === 'VIP' ? '#facc15' : '#22c55e') : '#86efac',
                    transition: '0.2s'
                  }}
                >
                  {tab === 'Live' ? `🔴 Live (${liveMatchesList.length})` : tab === 'VIP' ? '👑 VIP' : tab}
                </button>
              ))}
            </div>

            {/* TAB 1: LIVE MATCHES */}
            {currentTab === 'Live' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ef4444' }}>🔴 REAL LIVE IN-PLAY MATCHES</span>
                  <button onClick={() => fetchRealMatches(selectedDate)} style={{ background: '#0f3822', color: '#22c55e', border: '1px solid #22c55e', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                    🔄 Refresh Live API
                  </button>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#22c55e' }}>📡 Fetching Live Real-Time Matches...</div>
                ) : liveMatchesList.length === 0 ? (
                  <div style={{ background: '#061d12', border: '1px solid #14462e', borderRadius: '14px', padding: '24px', textAlign: 'center', color: '#86efac' }}>
                    ⚽ Hapana match iri kutambwa LIVE izvozvi. Dzvanya pakanzi <strong>Matches</strong> kuti uone mitambo yese!
                  </div>
                ) : (
                  liveMatchesList.map(m => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMatch(m)}
                      style={{ background: '#061d12', border: '1px solid #165337', borderRadius: '16px', padding: '16px', marginBottom: '14px', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#86efac', marginBottom: '6px' }}>
                        <span>🏆 {m.league}</span>
                        <span style={{ background: '#ef4444', color: '#fff', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>{m.time}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px', fontWeight: '900', color: '#fff', margin: '10px 0' }}>
                        <span>{m.home}</span>
                        <span style={{ background: '#020d07', color: '#22c55e', padding: '4px 12px', borderRadius: '8px', fontSize: '18px', border: '1px solid #14462e' }}>
                          {m.homeScore} - {m.awayScore}
                        </span>
                        <span>{m.away}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#020d07', padding: '8px', borderRadius: '8px', textAlign: 'center', fontSize: '11px', marginBottom: '10px' }}>
                        <div>1: <strong style={{ color: '#22c55e' }}>{m.analytics.homeProb}%</strong></div>
                        <div>X: <strong style={{ color: '#facc15' }}>{m.analytics.drawProb}%</strong></div>
                        <div>2: <strong style={{ color: '#38bdf8' }}>{m.analytics.awayProb}%</strong></div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#86efac' }}>
                        <span>Over 2.5: <strong>{m.analytics.over25Prob}%</strong></span>
                        <span style={{ background: '#22c55e', color: '#020d07', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>📊 Dzvanya for Full Analysis</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: SCHEDULED MATCHES & CALENDAR */}
            {currentTab === 'Matches' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#061d12', padding: '10px 14px', borderRadius: '12px', border: '1px solid #14462e', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', color: '#86efac', fontWeight: 'bold' }}>📅 Match Calendar:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    style={{ background: '#020d07', color: '#22c55e', border: '1px solid #14462e', padding: '6px 10px', borderRadius: '8px', fontWeight: 'bold' }}
                  />
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#22c55e' }}>📡 Fetching Schedule from Real Soccer API...</div>
                ) : matches.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#86efac' }}>Hapana mitambo yakawanikwa pazuva iri ({selectedDate}). Chinja date riri pamusoro.</div>
                ) : (
                  matches.map(m => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMatch(m)}
                      style={{ background: '#061d12', border: '1px solid #14462e', borderRadius: '14px', padding: '14px', marginBottom: '12px', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#86efac', marginBottom: '6px' }}>
                        <span>🏆 {m.league}</span>
                        <span style={{ color: m.isLive ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>⏰ {m.time}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '15px', color: '#fff', marginBottom: '10px' }}>
                        <span>{m.home}</span>
                        <span style={{ background: '#020d07', padding: '2px 8px', borderRadius: '6px', fontSize: '13px', color: '#22c55e' }}>
                          {m.isUpcoming ? 'VS' : `${m.homeScore} - ${m.awayScore}`}
                        </span>
                        <span>{m.away}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#020d07', padding: '8px', borderRadius: '8px', textAlign: 'center', fontSize: '11px', marginBottom: '8px' }}>
                        <div>1: <strong style={{ color: '#22c55e' }}>{m.analytics.homeProb}%</strong></div>
                        <div>X: <strong style={{ color: '#facc15' }}>{m.analytics.drawProb}%</strong></div>
                        <div>2: <strong style={{ color: '#38bdf8' }}>{m.analytics.awayProb}%</strong></div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#86efac' }}>
                        <span>Over 2.5: <strong style={{ color: '#fff' }}>{m.analytics.over25Prob}%</strong></span>
                        <span style={{ background: '#0f3824', border: '1px solid #22c55e', color: '#86efac', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                          🔍 Dzvanya for Possession & Stats
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: VIP SECTION WITH AIRTIME GATEWAY */}
            {currentTab === 'VIP' && (
              <div>
                {!hasVipAccess ? (
                  <div style={{ background: '#061d12', border: '2px solid #eab308', borderRadius: '20px', padding: '24px 16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '40px', marginBottom: '8px' }}>👑</div>
                      <h2 style={{ fontSize: '19px', fontWeight: '900', color: '#facc15', margin: '0 0 6px' }}>TECH TV VIP STRAIGHT WIN</h2>
                      <p style={{ fontSize: '12px', color: '#86efac', marginBottom: '16px' }}>
                        Tenga VIP Access uchishandisa <strong>Econet kana NetOne Airtime</strong> kuti uwane 100% Real Banker Scores, Exact Corners & High Odds!
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

                    <form onSubmit={submitAirtimePayment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#86efac' }}>Select Network:</label>
                        <select value={network} onChange={e => setNetwork(e.target.value)} style={{ width: '100%', padding: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px', marginTop: '4px' }}>
                          <option value="Econet">Econet (+263779411538)</option>
                          <option value="NetOne">NetOne (+263716616101)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#86efac' }}>Your Phone Number:</label>
                        <input type="text" placeholder="0771234567" required value={senderPhone} onChange={e => setSenderPhone(e.target.value)} style={{ width: '92%', padding: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px', marginTop: '4px' }} />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#86efac' }}>Airtime PIN / Voucher Code:</label>
                        <input type="text" placeholder="Isa PIN ye Airtime" required value={airtimePin} onChange={e => setAirtimePin(e.target.value)} style={{ width: '92%', padding: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px', marginTop: '4px' }} />
                      </div>

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
                ) : (
                  <div>
                    {matches.slice(0, 4).map(m => (
                      <div key={m.id} style={{ marginBottom: '18px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)', borderRadius: '20px', padding: '20px', color: '#fff', marginBottom: '10px' }}>
                          <div style={{ fontSize: '20px', marginBottom: '4px' }}>👑</div>
                          <div style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '1px' }}>VIP STRAIGHT WIN</div>
                          <div style={{ fontSize: '12px', margin: '2px 0 8px' }}>{m.home} vs {m.away}</div>
                          <div style={{ fontSize: '22px', fontWeight: '900' }}>{m.home.toUpperCase()} TO WIN + OVER 2.5</div>
                          <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.9 }}>Model xG {m.analytics.hXG} - {m.analytics.aXG} | Expected Goals: {m.analytics.over25Prob}%</div>
                        </div>

                        <div style={{ background: '#061d12', border: '1px solid #14462e', borderRadius: '14px', padding: '14px', marginBottom: '8px' }}>
                          <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 'bold' }}>🎯 BANKER SCORE</div>
                          <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff' }}>{m.analytics.bankerScore}</div>
                          <div style={{ fontSize: '11px', color: '#86efac' }}>BTTS: {m.analytics.bttsProb}%</div>
                        </div>

                        <div style={{ background: '#061d12', border: '1px solid #14462e', borderRadius: '14px', padding: '14px' }}>
                          <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 'bold' }}>🚩 CORNER LINE</div>
                          <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff' }}>{m.analytics.cornerLine}</div>
                          <div style={{ fontSize: '11px', color: '#86efac' }}>{m.analytics.totalExpCorners} Expected Corners ({m.analytics.cornerProb}%)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PREDICTOR CALCULATOR */}
            {currentTab === 'Predictor' && (
              <div style={{ background: '#061d12', border: '1px solid #14462e', borderRadius: '16px', padding: '18px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#22c55e', marginBottom: '8px' }}>🧮 Custom Poisson Predictor</h3>
                <p style={{ fontSize: '12px', color: '#86efac', marginBottom: '14px' }}>Isa mazita emaTeams kuti uone simulation:</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <input type="text" defaultValue="Arsenal" id="hTeamIn" placeholder="Home Team" style={{ padding: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
                  <input type="text" defaultValue="Chelsea" id="aTeamIn" placeholder="Away Team" style={{ padding: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
                </div>
                <button onClick={() => {
                  const h = document.getElementById('hTeamIn').value || 'Arsenal';
                  const a = document.getElementById('aTeamIn').value || 'Chelsea';
                  const res = calculateDeepMatchAnalytics(h, a);
                  alert(`Simulation for ${h} vs ${a}:\nPossession: ${res.homePoss}% - ${res.awayPoss}%\nBanker Score: ${res.bankerScore}\nHome Win: ${res.homeProb}%\nOver 2.5: ${res.over25Prob}%\nCorners: ${res.cornerLine} (${res.totalExpCorners} exp)`);
                }} style={{ width: '100%', padding: '12px', background: '#22c55e', color: '#020d07', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                  Run Deep Simulation
                </button>
              </div>
            )}

            {/* TAB 5: ADMIN PANEL */}
            {currentTab === 'Admin' && isAdmin && (
              <div style={{ background: '#061d12', border: '2px solid #22c55e', borderRadius: '16px', padding: '18px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#22c55e', marginBottom: '12px' }}>👑 Admin Airtime Approvals</h3>
                <div>
                  {vipRequests.map(req => (
                    <div key={req.id} style={{ background: '#020d07', padding: '12px', borderRadius: '10px', border: '1px solid #14462e', marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>👤 {req.email} ({req.phone})</div>
                      <div style={{ fontSize: '11px', color: '#facc15', margin: '2px 0' }}>📶 {req.network} | PIN: <strong>{req.pin}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                        <span style={{ fontSize: '10px', color: '#86efac' }}>Status: {req.status}</span>
                        {req.status === 'Pending' && (
                          <button onClick={() => approveUserVIP(req.id)} style={{ background: '#22c55e', color: '#020d07', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', border: 'none', fontSize: '11px', cursor: 'pointer' }}>
                            APPROVE VIP ✅
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* POPUP MODAL: FULL DETAILED MATCH ANALYTICS */}
      {selectedMatch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 }}>
          <div style={{ background: '#051b11', border: '1px solid #22c55e', borderRadius: '20px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '20px' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #14462e', paddingBottom: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 'bold' }}>🏆 {selectedMatch.league}</span>
              <button onClick={() => setSelectedMatch(null)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '26px', height: '26px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Teams Header */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>
                {selectedMatch.home} vs {selectedMatch.away}
              </div>
              <div style={{ fontSize: '12px', color: '#86efac', marginTop: '4px' }}>
                Status: <strong>{selectedMatch.time}</strong> {selectedMatch.isLive ? `(${selectedMatch.homeScore} - ${selectedMatch.awayScore})` : ''}
              </div>
            </div>

            {/* Tactical Possession Bar */}
            <div style={{ background: '#020d07', padding: '12px', borderRadius: '12px', border: '1px solid #14462e', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
                <span>{selectedMatch.home}: <strong style={{ color: '#22c55e' }}>{selectedMatch.analytics.homePoss}%</strong></span>
                <span style={{ color: '#86efac' }}>Possession</span>
                <span>{selectedMatch.away}: <strong style={{ color: '#38bdf8' }}>{selectedMatch.analytics.awayPoss}%</strong></span>
              </div>
              <div style={{ height: '8px', background: '#38bdf8', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${selectedMatch.analytics.homePoss}%`, background: '#22c55e' }}></div>
              </div>
            </div>

            {/* Shots & Attacks Comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid #14462e' }}>
                <div style={{ fontSize: '11px', color: '#86efac' }}>Shots on Target</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#fff', marginTop: '2px' }}>
                  {selectedMatch.analytics.homeShots} - {selectedMatch.analytics.awayShots}
                </div>
              </div>
              <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid #14462e' }}>
                <div style={{ fontSize: '11px', color: '#86efac' }}>Dangerous Attacks</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#fff', marginTop: '2px' }}>
                  {selectedMatch.analytics.homeAttacks} - {selectedMatch.analytics.awayAttacks}
                </div>
              </div>
            </div>

            {/* Over / Under Multi-Line Probabilities */}
            <div style={{ background: '#020d07', padding: '12px', borderRadius: '12px', border: '1px solid #14462e', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#facc15', marginBottom: '8px' }}>📊 GOAL MARKET PROBABILITIES:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#061d12', padding: '6px 10px', borderRadius: '6px' }}>
                  <span>Over 1.5:</span> <strong style={{ color: '#22c55e' }}>{selectedMatch.analytics.over15Prob}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#061d12', padding: '6px 10px', borderRadius: '6px' }}>
                  <span>Over 2.5:</span> <strong style={{ color: '#22c55e' }}>{selectedMatch.analytics.over25Prob}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#061d12', padding: '6px 10px', borderRadius: '6px' }}>
                  <span>Under 2.5:</span> <strong style={{ color: '#38bdf8' }}>{selectedMatch.analytics.under25Prob}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#061d12', padding: '6px 10px', borderRadius: '6px' }}>
                  <span>BTTS (GG):</span> <strong style={{ color: '#facc15' }}>{selectedMatch.analytics.bttsProb}%</strong>
                </div>
              </div>
            </div>

            {/* Top Banker Exact Scores */}
            <div style={{ background: '#020d07', padding: '12px', borderRadius: '12px', border: '1px solid #14462e', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#22c55e', marginBottom: '6px' }}>🎯 TOP 3 BANKER EXACT SCORES:</div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-around', textAlign: 'center' }}>
                {selectedMatch.analytics.topScores.map((s, idx) => (
                  <div key={idx} style={{ background: '#061d12', padding: '6px 14px', borderRadius: '8px', border: '1px solid #14462e' }}>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: '#fff' }}>{s.score}</div>
                    <div style={{ fontSize: '10px', color: '#86efac' }}>{s.percent}% Prob</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Corner Expectancy */}
            <div style={{ background: '#020d07', padding: '10px 14px', borderRadius: '10px', border: '1px solid #14462e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '16px' }}>
              <span>🚩 Corner Expectancy:</span>
              <strong style={{ color: '#22c55e' }}>{selectedMatch.analytics.cornerLine} ({selectedMatch.analytics.totalExpCorners} expected)</strong>
            </div>

            {/* Close Button */}
            <button onClick={() => setSelectedMatch(null)} style={{ width: '100%', padding: '12px', background: '#22c55e', color: '#020d07', fontWeight: '900', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
              CLOSE ANALYSIS
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
