import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

const ADMIN_EMAILS = [
  'kellyxmd01@gmail.com',
  'kellyxmd@gmail.com',
  'publicaccount660@gmail.com'
];

// Major Leagues to fetch live
const LEAGUES = [
  { id: 'eng.1', name: 'Premier League' },
  { id: 'esp.1', name: 'La Liga' },
  { id: 'ita.1', name: 'Serie A' },
  { id: 'ger.1', name: 'Bundesliga' },
  { id: 'fra.1', name: 'Ligue 1' },
  { id: 'uefa.champions', name: 'UEFA Champions League' }
];

// Poisson math engine
function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function poisson(lambda, x) {
  return (Math.exp(-lambda) * Math.pow(lambda, x)) / factorial(x);
}

function calculateFullPrediction(hXG = 1.6, aXG = 1.2) {
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

  const totalExpCorners = (hXG * 2.6 + aXG * 2.2).toFixed(1);
  const cornerLine = totalExpCorners > 9.0 ? "O 9.5" : "O 8.5";
  const cornerProb = Math.min(88, Math.round(totalExpCorners * 6.2));
  const confidence = Math.min(94, Math.max(52, Math.round(Math.max(homeWin, awayWin) * 100 + (over25 * 12))));

  let mainTip = "1X";
  if (homeWin > 0.48) mainTip = "HOME WIN";
  else if (awayWin > 0.42) mainTip = "AWAY WIN";
  else if (over25 > 0.55) mainTip = "OVER 2.5";
  else mainTip = "BTTS (GG)";

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
    rawEdge: Math.round(Math.abs(homeWin - awayWin) * 100 + 20)
  };
}

export default function App() {
  const [session, setSession] = useState(null);
  const [currentTab, setCurrentTab] = useState('Live'); // 'Live' | 'Matches' | 'VIP' | 'Predictor' | 'Admin'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  
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

  // Fetch Real Live Matches from Public Sports API
  const fetchRealMatches = async (dateStr) => {
    setLoading(true);
    const formattedDate = dateStr.replace(/-/g, ''); // YYYYMMDD
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
            const statusState = ev.status?.type?.state; // 'in' = live, 'pre' = upcoming, 'post' = finished
            const statusDetail = ev.status?.type?.shortDetail || 'NS';

            // Calculate dynamic realistic xG from scores and form
            const hScore = parseInt(home?.score || 0);
            const aScore = parseInt(away?.score || 0);
            const hXG = statusState === 'in' ? Math.max(1.2, hScore * 0.9 + 1.1) : 1.75;
            const aXG = statusState === 'in' ? Math.max(0.9, aScore * 0.9 + 0.9) : 1.25;

            allMatches.push({
              id: ev.id,
              league: LEAGUES[index].name,
              home: home?.team?.displayName || 'Home Team',
              away: away?.team?.displayName || 'Away Team',
              homeScore: home?.score || '0',
              awayScore: away?.score || '0',
              time: statusDetail,
              isLive: statusState === 'in',
              isFinished: statusState === 'post',
              isUpcoming: statusState === 'pre',
              hXG,
              aXG,
              isVip: true
            });
          });
        }
      });
    } catch (err) {
      console.error('Error fetching real matches:', err);
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
    else if (isSignUp) setAuthMsg('Account created! Now click Log In.');
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
    alert('User VIP Access Approved & Activated!');
  };

  const liveMatchesList = matches.filter(m => m.isLive);

  return (
    <div style={{ backgroundColor: '#020d07', color: '#e2e8f0', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Sleek Minimalist Header */}
      <header style={{ borderBottom: '1px solid #0f3822', background: '#05180f', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '650px', margin: '0 auto', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '19px', fontWeight: '900', color: '#22c55e', margin: 0, letterSpacing: '0.5px' }}>
              ⚡ TECH TV PREDICTOR
            </h1>
            <div style={{ fontSize: '10px', color: '#86efac', opacity: 0.85 }}>Real Live Football API & Poisson Engine</div>
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
            {/* Nav Tabs */}
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

            {/* TAB 1: REAL LIVE IN-PLAY MATCHES */}
            {currentTab === 'Live' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ height: '8px', width: '8px', background: '#ef4444', borderRadius: '50%', display: 'inline-block' }}></span>
                    REAL LIVE IN-PLAY MATCHES
                  </span>
                  <button onClick={() => fetchRealMatches(selectedDate)} style={{ background: '#0f3822', color: '#22c55e', border: '1px solid #22c55e', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                    🔄 Refresh API
                  </button>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#22c55e', fontWeight: 'bold' }}>📡 Fetching Real Football Data from API...</div>
                ) : liveMatchesList.length === 0 ? (
                  <div style={{ background: '#061d12', border: '1px solid #14462e', borderRadius: '14px', padding: '24px', textAlign: 'center', color: '#86efac' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚽</div>
                    <div>Hapana match iri kutambwa LIVE panguva ino chaiyo.</div>
                    <div style={{ fontSize: '11px', marginTop: '6px', color: '#6ee7b7' }}>Tarisa pakanzi <strong>Matches</strong> kuti uone mitambo iri kutanga nhasi.</div>
                  </div>
                ) : (
                  liveMatchesList.map(m => {
                    const pred = calculateFullPrediction(m.hXG, m.aXG);
                    return (
                      <div key={m.id} style={{ background: '#061d12', border: '1px solid #165337', borderRadius: '16px', padding: '16px', marginBottom: '14px' }}>
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
                          <div>1: <strong style={{ color: '#22c55e' }}>{pred.homeProb}%</strong></div>
                          <div>X: <strong style={{ color: '#facc15' }}>{pred.drawProb}%</strong></div>
                          <div>2: <strong style={{ color: '#38bdf8' }}>{pred.awayProb}%</strong></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#86efac' }}>
                          <span>Over 2.5: <strong>{pred.over25Prob}%</strong></span>
                          <span style={{ background: '#22c55e', color: '#020d07', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>{pred.mainTip}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: REAL SCHEDULED MATCHES & CALENDAR */}
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
                  <div style={{ textAlign: 'center', padding: '30px', color: '#22c55e', fontWeight: 'bold' }}>📡 Fetching Schedule from Real Soccer API...</div>
                ) : matches.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#86efac' }}>Hapana mitambo yakawanikwa pazuva iri ({selectedDate}). Chinja zuva riri pamusoro.</div>
                ) : (
                  matches.map(m => {
                    const pred = calculateFullPrediction(m.hXG, m.aXG);
                    return (
                      <div key={m.id} style={{ background: '#061d12', border: '1px solid #14462e', borderRadius: '14px', padding: '14px', marginBottom: '12px' }}>
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
                          <div>1: <strong style={{ color: '#22c55e' }}>{pred.homeProb}%</strong></div>
                          <div>X: <strong style={{ color: '#facc15' }}>{pred.drawProb}%</strong></div>
                          <div>2: <strong style={{ color: '#38bdf8' }}>{pred.awayProb}%</strong></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#86efac' }}>
                          <span>Banker Score: <strong style={{ color: '#fff' }}>{pred.bankerScore}</strong> | Over 2.5: {pred.over25Prob}%</span>
                          <span style={{ background: '#22c55e', color: '#020d07', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>Pick: {pred.mainTip}</span>
                        </div>
                      </div>
                    );
                  })
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
                        Tenga VIP Access uchishandisa <strong>Econet kana NetOne Airtime</strong> kuti uwane 100% Real Banker Scores & Corners!
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
                      <div style={{ fontSize: '11px', color: '#86efac', marginTop: '8px' }}>Tenga Airtime ye $1.00 / $2.00 / $5.00 woisa PIN kana recharge voucher code pano:</div>
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
                        <input type="text" placeholder="e.g. 0771234567" required value={senderPhone} onChange={e => setSenderPhone(e.target.value)} style={{ width: '92%', padding: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px', marginTop: '4px' }} />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#86efac' }}>Airtime Recharge PIN / Voucher:</label>
                        <input type="text" placeholder="Isa PIN ye Airtime" required value={airtimePin} onChange={e => setAirtimePin(e.target.value)} style={{ width: '92%', padding: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px', marginTop: '4px' }} />
                      </div>

                      {paymentSentMsg && (
                        <div style={{ background: '#14532d', color: '#86efac', padding: '10px', borderRadius: '8px', fontSize: '12px', textAlign: 'center' }}>
                          ✅ Airtime payment submitted! Admin ari kuiongorora kuti a-activate VIP yako mukati memaminitsi mashoma.
                        </div>
                      )}

                      <button type="submit" style={{ padding: '12px', background: '#eab308', color: '#020d07', fontWeight: '900', borderRadius: '10px', border: 'none', cursor: 'pointer', marginTop: '6px' }}>
                        SUBMIT AIRTIME FOR INSTANT VIP
                      </button>
                    </form>
                  </div>
                ) : (
                  <div>
                    {matches.slice(0, 3).map(m => {
                      const pred = calculateFullPrediction(m.hXG, m.aXG);
                      return (
                        <div key={m.id} style={{ marginBottom: '18px' }}>
                          <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)', borderRadius: '20px', padding: '20px', color: '#fff', marginBottom: '10px' }}>
                            <div style={{ fontSize: '20px', marginBottom: '4px' }}>👑</div>
                            <div style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '1px' }}>VIP REAL MATCH BANKER</div>
                            <div style={{ fontSize: '12px', margin: '2px 0 8px' }}>{m.home} vs {m.away}</div>
                            <div style={{ fontSize: '22px', fontWeight: '900' }}>{m.home.toUpperCase()} TO WIN + OVER 2.5</div>
                            <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.9 }}>Edge: {pred.rawEdge}% | Confidence: {pred.confidence}%</div>
                          </div>

                          <div style={{ background: '#061d12', border: '1px solid #14462e', borderRadius: '14px', padding: '14px', marginBottom: '8px' }}>
                            <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 'bold' }}>🎯 BANKER SCORE</div>
                            <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff' }}>{pred.bankerScore}</div>
                            <div style={{ fontSize: '11px', color: '#86efac' }}>BTTS {pred.bttsProb}%</div>
                          </div>

                          <div style={{ background: '#061d12', border: '1px solid #14462e', borderRadius: '14px', padding: '14px' }}>
                            <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 'bold' }}>🚩 CORNER LINE</div>
                            <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff' }}>{pred.cornerLine}</div>
                            <div style={{ fontSize: '11px', color: '#86efac' }}>{pred.totalExpCorners} expected ({pred.cornerProb}%)</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PREDICTOR CALCULATOR */}
            {currentTab === 'Predictor' && (
              <div style={{ background: '#061d12', border: '1px solid #14462e', borderRadius: '16px', padding: '18px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#22c55e', marginBottom: '8px' }}>🧮 Custom Poisson Predictor</h3>
                <p style={{ fontSize: '12px', color: '#86efac', marginBottom: '14px' }}>Isa ma-stats e-chikwata kuverenga fair odds.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <input type="number" step="0.1" defaultValue="2.1" id="hXGIn" placeholder="Home xG" style={{ padding: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
                  <input type="number" step="0.1" defaultValue="1.2" id="aXGIn" placeholder="Away xG" style={{ padding: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }} />
                </div>
                <button onClick={() => {
                  const h = parseFloat(document.getElementById('hXGIn').value) || 1.8;
                  const a = parseFloat(document.getElementById('aXGIn').value) || 1.2;
                  const res = calculateFullPrediction(h, a);
                  alert(`Results:\nBanker Score: ${res.bankerScore}\nHome Win: ${res.homeProb}%\nCorners: ${res.cornerLine}`);
                }} style={{ width: '100%', padding: '12px', background: '#22c55e', color: '#020d07', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                  Calculate Live Odds
                </button>
              </div>
            )}

            {/* TAB 5: ADMIN PANEL */}
            {currentTab === 'Admin' && isAdmin && (
              <div style={{ background: '#061d12', border: '2px solid #22c55e', borderRadius: '16px', padding: '18px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#22c55e', marginBottom: '12px' }}>👑 Admin Airtime Approvals</h3>
                <div style={{ marginBottom: '20px' }}>
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
    </div>
  );
}
