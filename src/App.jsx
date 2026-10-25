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

// PRO Team Rating Model
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
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) hash = (hash << 5) - hash + teamName.charCodeAt(i);
  return parseFloat((1.10 + (Math.abs(hash) % 85) / 100).toFixed(2));
}

function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function poisson(lambda, x) {
  return (Math.exp(-lambda) * Math.pow(lambda, x)) / factorial(x);
}

// PRO Comprehensive Analytics Model
function calculateProAnalytics(homeName, awayName, isLive, liveHScore = 0, liveAScore = 0) {
  let baseHXG = getTeamStrength(homeName) + 0.25;
  let baseAXG = getTeamStrength(awayName);

  if (isLive) {
    baseHXG = Math.max(1.1, baseHXG * 0.6 + parseInt(liveHScore) * 0.5);
    baseAXG = Math.max(0.9, baseAXG * 0.6 + parseInt(liveAScore) * 0.5);
  }

  const hXG = parseFloat(baseHXG.toFixed(2));
  const aXG = parseFloat(baseAXG.toFixed(2));

  let homeWin = 0, draw = 0, awayWin = 0;
  let over15 = 0, over25 = 0, over35 = 0, btts = 0;
  let cleanSheetHome = 0, cleanSheetAway = 0;
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
      if (a === 0) cleanSheetHome += p;
      if (h === 0) cleanSheetAway += p;
    }
  }

  scoreMatrix.sort((a, b) => b.prob - a.prob);
  const topScores = scoreMatrix.slice(0, 3).map(s => ({
    score: s.score,
    percent: (s.prob * 100).toFixed(1)
  }));

  // Corners & Cards Model
  const totalExpCorners = (hXG * 2.7 + aXG * 2.3).toFixed(1);
  const expCards = (3.4 + (Math.abs(hXG - aXG) < 0.3 ? 1.2 : 0.4)).toFixed(1);

  // HT / FT Probabilities
  let htFt = "1 / 1";
  if (homeWin > 0.50) htFt = "1 / 1 (Home - Home)";
  else if (awayWin > 0.45) htFt = "2 / 2 (Away - Away)";
  else htFt = "X / 1 (Draw - Home)";

  // Multi-Goals Range
  const goalsRange = over25 > 0.55 ? "2 - 4 Goals" : "1 - 3 Goals";

  let mainTip = "1X";
  if (homeWin > 0.52) mainTip = "HOME WIN";
  else if (awayWin > 0.46) mainTip = "AWAY WIN";
  else if (over25 > 0.58) mainTip = "OVER 2.5 GOALS";
  else mainTip = "BTTS (GG)";

  const totalPower = hXG + aXG;
  let homePoss = Math.min(68, Math.max(38, Math.round((hXG / totalPower) * 100)));

  return {
    hXG, aXG,
    homePoss, awayPoss: 100 - homePoss,
    homeProb: (homeWin * 100).toFixed(1),
    drawProb: (draw * 100).toFixed(1),
    awayProb: (awayWin * 100).toFixed(1),
    over15Prob: (over15 * 100).toFixed(1),
    over25Prob: (over25 * 100).toFixed(1),
    over35Prob: (over35 * 100).toFixed(1),
    bttsProb: (btts * 100).toFixed(1),
    cleanSheetHome: (cleanSheetHome * 100).toFixed(0),
    cleanSheetAway: (cleanSheetAway * 100).toFixed(0),
    topScores,
    totalExpCorners,
    cornerLine: totalExpCorners > 9.2 ? 'Over 9.5' : 'Over 8.5',
    expCards,
    cardsLine: parseFloat(expCards) > 3.8 ? 'Over 3.5 Cards' : 'Under 4.5 Cards',
    htFt,
    goalsRange,
    mainTip
  };
}

export default function App() {
  const [session, setSession] = useState(null);
  const [currentTab, setCurrentTab] = useState('Matches');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [liveStatsLoading, setLiveStatsLoading] = useState(false);
  const [liveData, setLiveData] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('stats'); // 'stats' | 'events' | 'markets'

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMsg, setAuthMsg] = useState('');

  // VIP State
  const [isVipSubscribed, setIsVipSubscribed] = useState(false);
  const [network, setNetwork] = useState('Econet');
  const [senderPhone, setSenderPhone] = useState('');
  const [airtimePin, setAirtimePin] = useState('');
  const [vipRequests, setVipRequests] = useState([
    { id: 1, email: 'client@gmail.com', network: 'Econet (0779411538)', pin: '4829-1092-3841', phone: '0779411538', status: 'Pending' }
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
        if (data && data.events) {
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
            const isUpcoming = statusState === 'pre';
            const isFinished = statusState === 'post';

            const analytics = calculateProAnalytics(homeName, awayName, isLive, homeScore, awayScore);

            allMatches.push({
              id: ev.id,
              leagueId: LEAGUES[index].id,
              league: LEAGUES[index].name,
              home: homeName,
              away: awayName,
              homeLogo: home?.team?.logo || '',
              awayLogo: away?.team?.logo || '',
              homeScore,
              awayScore,
              time: statusDetail,
              isLive,
              isFinished,
              isUpcoming,
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

  // Fetch Full Pro Match Events & Real Live Match Statistics
  const handleOpenProMatch = async (m) => {
    setSelectedMatch(m);
    setLiveData(null);
    setActiveModalTab(m.isUpcoming ? 'markets' : 'stats');

    if (m.isLive || m.isFinished) {
      setLiveStatsLoading(true);
      try {
        const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${m.leagueId}/summary?event=${m.id}`);
        const data = await res.json();

        // Extract Real Statistics
        const stats = data?.boxscore?.teams;
        let sMap = {
          possession: { h: `${m.analytics.homePoss}%`, a: `${m.analytics.awayPoss}%` },
          shotsOnTarget: { h: '0', a: '0' },
          totalShots: { h: '0', a: '0' },
          corners: { h: '0', a: '0' },
          fouls: { h: '0', a: '0' },
          yellowCards: { h: '0', a: '0' },
          redCards: { h: '0', a: '0' },
          offsides: { h: '0', a: '0' },
          saves: { h: '0', a: '0' }
        };

        if (stats && stats.length >= 2) {
          const parseStat = (arr, name) => arr?.find(s => s.name === name)?.displayValue || '0';
          const hSt = stats[0]?.statistics;
          const aSt = stats[1]?.statistics;

          sMap.possession = { h: `${parseStat(hSt, 'possessionPct')}%`, a: `${parseStat(aSt, 'possessionPct')}%` };
          sMap.shotsOnTarget = { h: parseStat(hSt, 'shotsOnTarget'), a: parseStat(aSt, 'shotsOnTarget') };
          sMap.totalShots = { h: parseStat(hSt, 'totalShots'), a: parseStat(aSt, 'totalShots') };
          sMap.corners = { h: parseStat(hSt, 'wonCorners'), a: parseStat(aSt, 'wonCorners') };
          sMap.fouls = { h: parseStat(hSt, 'foulsCommitted'), a: parseStat(aSt, 'foulsCommitted') };
          sMap.yellowCards = { h: parseStat(hSt, 'yellowCards'), a: parseStat(aSt, 'yellowCards') };
          sMap.redCards = { h: parseStat(hSt, 'redCards'), a: parseStat(aSt, 'redCards') };
          sMap.offsides = { h: parseStat(hSt, 'offsides'), a: parseStat(aSt, 'offsides') };
          sMap.saves = { h: parseStat(hSt, 'saves'), a: parseStat(aSt, 'saves') };
        }

        // Extract Key Match Events (Goals, Cards, Substitutions)
        let eventsList = [];
        const plays = data?.keyEvents || data?.plays || [];
        plays.forEach(p => {
          const text = p.text || '';
          const clock = p.clock?.displayValue || `${p.time?.displayValue || ''}'`;
          let type = 'event';
          if (text.toLowerCase().includes('goal') || text.toLowerCase().includes('scores')) type = 'goal';
          else if (text.toLowerCase().includes('yellow card')) type = 'yellow';
          else if (text.toLowerCase().includes('red card')) type = 'red';
          else if (text.toLowerCase().includes('substitution')) type = 'sub';

          eventsList.push({ minute: clock, text, type });
        });

        // Compute Live Dangerous Attacks Momentum
        const hSotInt = parseInt(sMap.shotsOnTarget.h) || 0;
        const aSotInt = parseInt(sMap.shotsOnTarget.a) || 0;
        const dangerousAttacks = {
          h: Math.round(hSotInt * 5.8 + 24),
          a: Math.round(aSotInt * 5.4 + 18)
        };

        setLiveData({
          stats: sMap,
          events: eventsList,
          dangerousAttacks,
          hasLiveFeed: true
        });
      } catch (err) {
        console.error('Error fetching event summary:', err);
      }
      setLiveStatsLoading(false);
    }
  };

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
    else if (isSignUp) setAuthMsg('Account created! Now Log In.');
  };

  const submitAirtimePayment = (e) => {
    e.preventDefault();
    if (!airtimePin || !senderPhone) return alert('Pinda Phone Number ne Airtime PIN!');
    const newReq = {
      id: Date.now(),
      email: userEmail || 'Customer',
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
    alert('User VIP Access Approved & Activated!');
  };

  const liveMatches = matches.filter(m => m.isLive);

  return (
    <div style={{ backgroundColor: '#020d07', color: '#e2e8f0', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Header */}
      <header style={{ borderBottom: '1px solid #0f3822', background: '#05180f', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '650px', margin: '0 auto', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '900', color: '#22c55e', margin: 0, letterSpacing: '0.5px' }}>
              ⚡ TECH TV PREDICTOR <span style={{ fontSize: '10px', background: '#22c55e', color: '#020d07', padding: '1px 5px', borderRadius: '4px', verticalAlign: 'middle' }}>PRO</span>
            </h1>
            <div style={{ fontSize: '10px', color: '#86efac', opacity: 0.85 }}>Real-Time Live Timeline, Match Events & Poisson Hub</div>
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

      {/* Main Content */}
      <main style={{ maxWidth: '650px', margin: '0 auto', padding: '14px 16px 80px' }}>
        
        {!session ? (
          <div style={{ background: '#051b11', padding: '24px', borderRadius: '16px', border: '1px solid #14462e', marginTop: '20px' }}>
            <h2 style={{ textAlign: 'center', fontSize: '18px', color: '#fff', marginBottom: '4px' }}>Sign In to TECH TV PRO</h2>
            <p style={{ textAlign: 'center', color: '#86efac', fontSize: '12px', marginBottom: '18px' }}>Live Matches, Red/Yellow Cards, SOT & VIP Predictions</p>

            <button onClick={handleGoogleLogin} style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '16px' }}>
              Continue with Google
            </button>
            
            <div style={{ textAlign: 'center', color: '#4ade80', fontSize: '11px', marginBottom: '12px' }}>OR EMAIL / PASSWORD</div>
            
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
            
            {/* Top Navigation Tabs */}
            <div style={{ display: 'flex', background: '#05180f', padding: '4px', borderRadius: '12px', margin: '8px 0 16px', border: '1px solid #14462e' }}>
              {['Live', 'Matches', 'VIP', 'Simulator', ...(isAdmin ? ['Admin'] : [])].map(tab => (
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
                  {tab === 'Live' ? `🔴 Live (${liveMatches.length})` : tab === 'VIP' ? '👑 VIP' : tab}
                </button>
              ))}
            </div>

            {/* TAB 1: LIVE REAL-TIME MATCHES */}
            {currentTab === 'Live' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ height: '8px', width: '8px', background: '#ef4444', borderRadius: '50%', display: 'inline-block' }}></span>
                    PRO LIVE MATCH TRACKER
                  </span>
                  <button onClick={() => fetchRealMatches(selectedDate)} style={{ background: '#0f3822', color: '#22c55e', border: '1px solid #22c55e', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                    🔄 Refresh Feed
                  </button>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#22c55e' }}>📡 Fetching In-Play Live Data...</div>
                ) : liveMatches.length === 0 ? (
                  <div style={{ background: '#061d12', border: '1px solid #14462e', borderRadius: '14px', padding: '24px', textAlign: 'center', color: '#86efac' }}>
                    ⚽ Hapana mutambo uri live izvozvi. Tarisa pakanzi <strong>Matches</strong> kuti uone ma fixtures anhasi!
                  </div>
                ) : (
                  liveMatches.map(m => (
                    <div
                      key={m.id}
                      onClick={() => handleOpenProMatch(m)}
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
                        <span>Banker: <strong style={{ color: '#fff' }}>{m.analytics.topScores[0]?.score}</strong></span>
                        <span style={{ background: '#22c55e', color: '#020d07', padding: '4px 10px', borderRadius: '6px', fontWeight: '900' }}>
                          ⚡ Vhura Live Match Center
                        </span>
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
                  <div style={{ textAlign: 'center', padding: '30px', color: '#22c55e' }}>📡 Fetching Live Real Matches from Server...</div>
                ) : matches.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#86efac' }}>Hapana mitambo pazuva iri ({selectedDate}). Chinja date riri pamusoro.</div>
                ) : (
                  matches.map(m => (
                    <div
                      key={m.id}
                      onClick={() => handleOpenProMatch(m)}
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
                        <span>Over 2.5: <strong style={{ color: '#fff' }}>{m.analytics.over25Prob}%</strong> | Cards: {m.analytics.cardsLine}</span>
                        <span style={{ background: '#0f3824', border: '1px solid #22c55e', color: '#86efac', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                          📊 Dzvanya for PRO Analytics
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: PRO VIP SECTION */}
            {currentTab === 'VIP' && (
              <div>
                {!hasVipAccess ? (
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

                    <form onSubmit={submitAirtimePayment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                ) : (
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
                )}
              </div>
            )}

            {/* TAB 4: SIMULATOR */}
            {currentTab === 'Simulator' && (
              <div style={{ background: '#061d12', border: '1px solid #14462e', borderRadius: '16px', padding: '18px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#22c55e', marginBottom: '8px' }}>🧮 Custom Match Engine</h3>
                <p style={{ fontSize: '12px', color: '#86efac', marginBottom: '14px' }}>Simulate chero mutambo nema-markets ose:</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <input type="text" defaultValue="Arsenal" id="hIn" placeholder="Home Team" style={{ padding: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
                  <input type="text" defaultValue="Chelsea" id="aIn" placeholder="Away Team" style={{ padding: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
                </div>
                <button onClick={() => {
                  const h = document.getElementById('hIn').value || 'Arsenal';
                  const a = document.getElementById('aIn').value || 'Chelsea';
                  const res = calculateProAnalytics(h, a, false);
                  alert(`Simulation for ${h} vs ${a}:\nHT/FT: ${res.htFt}\nBanker Score: ${res.topScores[0]?.score}\nOver 2.5: ${res.over25Prob}%\nCards: ${res.cardsLine}\nCorners: ${res.cornerLine}`);
                }} style={{ width: '100%', padding: '12px', background: '#22c55e', color: '#020d07', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                  Run Complete Simulation
                </button>
              </div>
            )}

            {/* TAB 5: ADMIN */}
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

      {/* PRO LIVE MATCH CENTER POPUP */}
      {selectedMatch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', zIndex: 100 }}>
          <div style={{ background: '#051b11', border: '1px solid #22c55e', borderRadius: '22px', width: '100%', maxWidth: '540px', maxHeight: '92vh', overflowY: 'auto', padding: '18px' }}>
            
            {/* Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #14462e', paddingBottom: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 'bold' }}>🏆 {selectedMatch.league}</span>
              <button onClick={() => setSelectedMatch(null)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Scoreboard Header */}
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

            {/* Sub-Tabs: Live Stats | Timeline Events | PRO Markets */}
            <div style={{ display: 'flex', background: '#020d07', padding: '4px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #14462e' }}>
              {!selectedMatch.isUpcoming && (
                <>
                  <button onClick={() => setActiveModalTab('stats')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', background: activeModalTab === 'stats' ? '#14462e' : 'transparent', color: activeModalTab === 'stats' ? '#22c55e' : '#86efac' }}>
                    📊 Match Stats
                  </button>
                  <button onClick={() => setActiveModalTab('events')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', background: activeModalTab === 'events' ? '#14462e' : 'transparent', color: activeModalTab === 'events' ? '#22c55e' : '#86efac' }}>
                    ⚡ Timeline & Events
                  </button>
                </>
              )}
              <button onClick={() => setActiveModalTab('markets')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', background: activeModalTab === 'markets' ? '#14462e' : 'transparent', color: activeModalTab === 'markets' ? '#22c55e' : '#86efac' }}>
                🎯 PRO Markets
              </button>
            </div>

            {/* 1. MATCH STATS TAB */}
            {activeModalTab === 'stats' && !selectedMatch.isUpcoming && (
              <div>
                {liveStatsLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#22c55e', fontSize: '12px' }}>📡 Fetching Real-Time SOT, Cards & Attacks...</div>
                ) : (
                  <div>
                    {/* Possession Bar */}
                    <div style={{ background: '#020d07', padding: '10px 14px', borderRadius: '12px', border: '1px solid #14462e', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                        <span>{liveData?.stats?.possession?.h || '50%'}</span>
                        <span style={{ color: '#86efac' }}>Possession</span>
                        <span>{liveData?.stats?.possession?.a || '50%'}</span>
                      </div>
                      <div style={{ height: '7px', background: '#38bdf8', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: liveData?.stats?.possession?.h || '50%', background: '#22c55e' }}></div>
                      </div>
                    </div>

                    {/* Detailed Stats Comparison Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                      {[
                        { label: '🎯 Shots on Target', h: liveData?.stats?.shotsOnTarget?.h || '0', a: liveData?.stats?.shotsOnTarget?.a || '0' },
                        { label: '⚽ Total Shots', h: liveData?.stats?.totalShots?.h || '0', a: liveData?.stats?.totalShots?.a || '0' },
                        { label: '🚩 Corners', h: liveData?.stats?.corners?.h || '0', a: liveData?.stats?.corners?.a || '0' },
                        { label: '🔥 Dangerous Attacks', h: liveData?.dangerousAttacks?.h || '0', a: liveData?.dangerousAttacks?.a || '0' },
                        { label: '⚠️ Fouls Committed', h: liveData?.stats?.fouls?.h || '0', a: liveData?.stats?.fouls?.a || '0' },
                        { label: '🟨 Yellow Cards', h: liveData?.stats?.yellowCards?.h || '0', a: liveData?.stats?.yellowCards?.a || '0' },
                        { label: '🟥 Red Cards', h: liveData?.stats?.redCards?.h || '0', a: liveData?.stats?.redCards?.a || '0' },
                        { label: '🛑 Offsides', h: liveData?.stats?.offsides?.h || '0', a: liveData?.stats?.offsides?.a || '0' },
                        { label: '🧤 Goalkeeper Saves', h: liveData?.stats?.saves?.h || '0', a: liveData?.stats?.saves?.a || '0' }
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

            {/* 2. MATCH EVENTS TIMELINE TAB */}
            {activeModalTab === 'events' && !selectedMatch.isUpcoming && (
              <div>
                {liveStatsLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#22c55e', fontSize: '12px' }}>📡 Fetching Timeline Feed...</div>
                ) : (liveData?.events || []).length === 0 ? (
                  <div style={{ background: '#020d07', padding: '16px', borderRadius: '12px', textAlign: 'center', color: '#86efac', fontSize: '12px' }}>
                    Hapana zviri kuitika pa key events izvozvi.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                    {liveData.events.map((ev, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#020d07', padding: '8px 12px', borderRadius: '8px', border: '1px solid #14462e', fontSize: '11px' }}>
                        <span style={{ background: '#14462e', color: '#22c55e', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '10px' }}>{ev.minute}</span>
                        <span>{ev.type === 'goal' ? '⚽' : ev.type === 'yellow' ? '🟨' : ev.type === 'red' ? '🟥' : '🔄'}</span>
                        <span style={{ color: '#e2e8f0' }}>{ev.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. PRO BETTING MARKETS TAB */}
            {activeModalTab === 'markets' && (
              <div>
                {selectedMatch.isUpcoming && (
                  <div style={{ background: '#020d07', border: '1px solid #1b5e3d', padding: '8px 12px', borderRadius: '8px', textAlign: 'center', marginBottom: '12px', color: '#86efac', fontSize: '11px' }}>
                    ⏳ Mutambo usati watanga. Heano ma-pre-match analytics:
                  </div>
                )}

                {/* HT / FT & Goal Range */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#86efac' }}>Half Time / Full Time</div>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#22c55e', marginTop: '2px' }}>{selectedMatch.analytics.htFt}</div>
                  </div>
                  <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#86efac' }}>Multi-Goals Range</div>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#facc15', marginTop: '2px' }}>{selectedMatch.analytics.goalsRange}</div>
                  </div>
                </div>

                {/* Clean Sheet Probabilities */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#86efac' }}>{selectedMatch.home} Clean Sheet</div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#fff' }}>{selectedMatch.analytics.cleanSheetHome}%</div>
                  </div>
                  <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#86efac' }}>{selectedMatch.away} Clean Sheet</div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#fff' }}>{selectedMatch.analytics.cleanSheetAway}%</div>
                  </div>
                </div>

                {/* Goal Markets */}
                <div style={{ background: '#020d07', padding: '10px', borderRadius: '10px', border: '1px solid #14462e', marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#facc15', marginBottom: '6px' }}>📊 OVER / UNDER MARKETS:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#061d12', padding: '5px 8px', borderRadius: '6px' }}>
                      <span>Over 1.5:</span> <strong style={{ color: '#22c55e' }}>{selectedMatch.analytics.over15Prob}%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#061d12', padding: '5px 8px', borderRadius: '6px' }}>
                      <span>Over 2.5:</span> <strong style={{ color: '#22c55e' }}>{selectedMatch.analytics.over25Prob}%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#061d12', padding: '5px 8px', borderRadius: '6px' }}>
                      <span>Over 3.5:</span> <strong style={{ color: '#38bdf8' }}>{selectedMatch.analytics.over35Prob}%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#061d12', padding: '5px 8px', borderRadius: '6px' }}>
                      <span>BTTS (GG):</span> <strong style={{ color: '#facc15' }}>{selectedMatch.analytics.bttsProb}%</strong>
                    </div>
                  </div>
                </div>

                {/* Cards & Corners Forecast */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ background: '#020d07', padding: '8px', borderRadius: '8px', border: '1px solid #14462e', fontSize: '11px' }}>
                    <span style={{ color: '#86efac' }}>🚩 Corners: </span>
                    <strong style={{ color: '#22c55e' }}>{selectedMatch.analytics.cornerLine}</strong>
                  </div>
                  <div style={{ background: '#020d07', padding: '8px', borderRadius: '8px', border: '1px solid #14462e', fontSize: '11px' }}>
                    <span style={{ color: '#86efac' }}>🟨 Cards: </span>
                    <strong style={{ color: '#facc15' }}>{selectedMatch.analytics.cardsLine}</strong>
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => setSelectedMatch(null)} style={{ width: '100%', padding: '12px', background: '#22c55e', color: '#020d07', fontWeight: '900', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
              CLOSE PRO CENTER
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
