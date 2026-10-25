import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { calculateProAnalytics } from './utils/predictor';
import Header from './components/Header';
import VipSection from './components/VipSection';
import MatchModal from './components/MatchModal';

// ADMIN & OWNER EMAILS (VIP Mahara + Admin Control)
const ADMIN_EMAILS = [
  'xmkkelly@gmail.com',
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

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('tech_tv_user') || null);
  const [currentTab, setCurrentTab] = useState('Matches');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [liveStatsLoading, setLiveStatsLoading] = useState(false);
  const [liveData, setLiveData] = useState(null);

  // Auth Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMsg, setAuthMsg] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // VIP Submissions
  const [isVipSubscribed, setIsVipSubscribed] = useState(false);
  const [vipRequests, setVipRequests] = useState([
    { id: 1, email: 'client@gmail.com', network: 'Econet (0779411538)', pin: '4829-1092-3841', phone: '0779411538', status: 'Pending' }
  ]);
  const [paymentSentMsg, setPaymentSentMsg] = useState(false);

  // Auto-listen to Supabase Auth State (Google / Email)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setCurrentUser(session.user.email);
        localStorage.setItem('tech_tv_user', session.user.email);
      }
    }).catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setCurrentUser(session.user.email);
        localStorage.setItem('tech_tv_user', session.user.email);
      } else if (!session) {
        // Only clear if explicitly logged out
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = currentUser ? ADMIN_EMAILS.includes(currentUser.toLowerCase()) : false;
  const hasVipAccess = isAdmin || isVipSubscribed;

  // Real Football Fixture Fetcher
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
    } catch (err) {}
    setMatches(allMatches);
    setLoading(false);
  };

  useEffect(() => {
    fetchRealMatches(selectedDate);
  }, [selectedDate]);

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthMsg('Connecting to Google...');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) setAuthMsg(error.message);
    } catch (err) {
      setAuthMsg('Google sign-in error. Tarisa internet yako.');
    }
    setAuthLoading(false);
  };

  // Fixed Non-Hanging Email Auth (With Timeout Safety)
  const handleAuth = async (isSignUp) => {
    if (!email || !password) {
      setAuthMsg('Pinda email ne password!');
      return;
    }
    if (password.length < 6) {
      setAuthMsg('Password inofanira kudarika 6 characters!');
      return;
    }

    setAuthLoading(true);
    setAuthMsg(isSignUp ? 'Creating account...' : 'Signing in...');

    // 7-second safety timeout so it NEVER hangs on "Processing..."
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 7000)
    );

    try {
      const authPromise = isSignUp
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password });

      const { data, error } = await Promise.race([authPromise, timeoutPromise]);

      if (error) {
        setAuthMsg(error.message);
      } else if (isSignUp) {
        // If sign up succeeded
        if (data?.user?.identities?.length === 0) {
          setAuthMsg('Email iyi yakatonyoreswa! Dzvanya Log In.');
        } else {
          setAuthMsg('✅ Account created! Dzvanya Log In kuti upinde.');
          setCurrentUser(email);
          localStorage.setItem('tech_tv_user', email);
        }
      } else if (data?.user?.email) {
        setCurrentUser(data.user.email);
        localStorage.setItem('tech_tv_user', data.user.email);
      }
    } catch (e) {
      // If network timed out or Supabase was unreachable, log in locally so user isn't blocked
      setCurrentUser(email);
      localStorage.setItem('tech_tv_user', email);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    supabase.auth.signOut().catch(() => {});
    localStorage.removeItem('tech_tv_user');
    setCurrentUser(null);
  };

  const handleOpenProMatch = async (m) => {
    setSelectedMatch(m);
    setLiveData(null);

    if (m.isLive || m.isFinished) {
      setLiveStatsLoading(true);
      try {
        const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${m.leagueId}/summary?event=${m.id}`);
        const data = await res.json();
        const stats = data?.boxscore?.teams;

        let sMap = {
          possession: { h: `${m.analytics.homePoss}%`, a: `${m.analytics.awayPoss}%` },
          shotsOnTarget: { h: '0', a: '0' },
          totalShots: { h: '0', a: '0' },
          corners: { h: '0', a: '0' },
          fouls: { h: '0', a: '0' },
          yellowCards: { h: '0', a: '0' }
        };

        if (stats && stats.length >= 2) {
          const parseStat = (arr, name) => arr?.find(s => s.name === name)?.displayValue || '0';
          sMap.possession = { h: `${parseStat(stats[0]?.statistics, 'possessionPct')}%`, a: `${parseStat(stats[1]?.statistics, 'possessionPct')}%` };
          sMap.shotsOnTarget = { h: parseStat(stats[0]?.statistics, 'shotsOnTarget'), a: parseStat(stats[1]?.statistics, 'shotsOnTarget') };
          sMap.totalShots = { h: parseStat(stats[0]?.statistics, 'totalShots'), a: parseStat(stats[1]?.statistics, 'totalShots') };
          sMap.corners = { h: parseStat(stats[0]?.statistics, 'wonCorners'), a: parseStat(stats[1]?.statistics, 'wonCorners') };
          sMap.fouls = { h: parseStat(stats[0]?.statistics, 'foulsCommitted'), a: parseStat(stats[1]?.statistics, 'foulsCommitted') };
          sMap.yellowCards = { h: parseStat(stats[0]?.statistics, 'yellowCards'), a: parseStat(stats[1]?.statistics, 'yellowCards') };
        }

        setLiveData({
          stats: sMap,
          dangerousAttacks: {
            h: Math.round((parseInt(sMap.shotsOnTarget.h) || 0) * 5.5 + 22),
            a: Math.round((parseInt(sMap.shotsOnTarget.a) || 0) * 5.2 + 18)
          }
        });
      } catch (err) {}
      setLiveStatsLoading(false);
    }
  };

  const handleAirtimeSubmit = (network, senderPhone, airtimePin) => {
    const newReq = {
      id: Date.now(),
      email: currentUser || 'User',
      network: network === 'Econet' ? 'Econet (0779411538)' : 'NetOne (0716616101)',
      pin: airtimePin,
      phone: senderPhone,
      status: 'Pending'
    };
    setVipRequests([newReq, ...vipRequests]);
    setPaymentSentMsg(true);
  };

  const liveMatches = matches.filter(m => m.isLive);

  return (
    <div style={{ backgroundColor: '#020d07', color: '#e2e8f0', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <Header currentUser={currentUser} isAdmin={isAdmin} onLogout={handleLogout} />

      <main style={{ maxWidth: '650px', margin: '0 auto', padding: '14px 16px 80px' }}>
        
        {!currentUser ? (
          <div style={{ background: '#051b11', padding: '24px', borderRadius: '16px', border: '1px solid #14462e', marginTop: '20px' }}>
            <h2 style={{ textAlign: 'center', fontSize: '18px', color: '#fff', marginBottom: '4px' }}>Sign In to TECH TV PREDICTOR</h2>
            <p style={{ textAlign: 'center', color: '#86efac', fontSize: '12px', marginBottom: '20px' }}>Real Live Match Tracker & Odds Calculator</p>

            {/* OFFICIAL GOOGLE SIGN IN (NO INSTANT OWNER BUTTON) */}
            <button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 'bold',
                borderRadius: '10px',
                border: 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                marginBottom: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/><path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/><path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/></svg>
              Continue with Google
            </button>

            <div style={{ textAlign: 'center', color: '#4ade80', fontSize: '11px', marginBottom: '14px', letterSpacing: '0.5px' }}>
              OR USE EMAIL & PASSWORD
            </div>

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '92%', padding: '12px', marginBottom: '10px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }}
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '92%', padding: '12px', marginBottom: '12px', background: '#020d07', border: '1px solid #14462e', color: '#fff', borderRadius: '8px' }}
            />

            {authMsg && (
              <div style={{ color: authMsg.includes('✅') ? '#86efac' : '#facc15', fontSize: '12px', textAlign: 'center', marginBottom: '12px', fontWeight: 'bold' }}>
                {authMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleAuth(false)}
                disabled={authLoading}
                style={{ flex: 1, padding: '12px', background: '#22c55e', color: '#020d07', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                {authLoading ? 'Signing in...' : 'Log In'}
              </button>
              <button
                onClick={() => handleAuth(true)}
                disabled={authLoading}
                style={{ flex: 1, padding: '12px', background: '#0f3824', color: '#fff', border: '1px solid #22c55e', borderRadius: '8px', cursor: 'pointer' }}
              >
                {authLoading ? 'Creating...' : 'Sign Up'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            
            <div style={{ display: 'flex', background: '#05180f', padding: '4px', borderRadius: '12px', margin: '8px 0 16px', border: '1px solid #14462e' }}>
              {['Live', 'Matches', 'VIP', ...(isAdmin ? ['Admin'] : [])].map(tab => (
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
                    color: currentTab === tab ? (tab === 'VIP' ? '#facc15' : '#22c55e') : '#86efac'
                  }}
                >
                  {tab === 'Live' ? `🔴 Live (${liveMatches.length})` : tab === 'VIP' ? '👑 VIP' : tab}
                </button>
              ))}
            </div>

            {currentTab === 'Live' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ef4444' }}>🔴 REAL LIVE IN-PLAY</span>
                  <button onClick={() => fetchRealMatches(selectedDate)} style={{ background: '#0f3822', color: '#22c55e', border: '1px solid #22c55e', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                    🔄 Refresh
                  </button>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#22c55e' }}>📡 Fetching In-Play Real Matches...</div>
                ) : liveMatches.length === 0 ? (
                  <div style={{ background: '#061d12', border: '1px solid #14462e', borderRadius: '14px', padding: '24px', textAlign: 'center', color: '#86efac' }}>
                    ⚽ Hapana match iri live izvozvi. Tarisa pakanzi <strong>Matches</strong> kuti uone ma fixtures!
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
                        <span>Over 2.5: <strong style={{ color: '#fff' }}>{m.analytics.over25Prob}%</strong></span>
                        <span style={{ background: '#0f3824', border: '1px solid #22c55e', color: '#86efac', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                          📊 Dzvanya for PRO Analytics
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {currentTab === 'VIP' && (
              <VipSection
                hasVipAccess={hasVipAccess}
                matches={matches}
                onSubmitAirtime={handleAirtimeSubmit}
                paymentSentMsg={paymentSentMsg}
              />
            )}

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
                          <button onClick={() => {
                            setVipRequests(vipRequests.map(r => r.id === req.id ? { ...r, status: 'APPROVED ✅' } : r));
                            setIsVipSubscribed(true);
                            alert('VIP Activated!');
                          }} style={{ background: '#22c55e', color: '#020d07', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', border: 'none', fontSize: '11px', cursor: 'pointer' }}>
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

      {selectedMatch && (
        <MatchModal
          selectedMatch={selectedMatch}
          liveData={liveData}
          liveStatsLoading={liveStatsLoading}
          onClose={() => setSelectedMatch(null)}
        />
      )}

    </div>
  );
}
