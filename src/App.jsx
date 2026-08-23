import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { getOddsPrediction } from './predictor';

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const matches = [
    { id: 1, league: 'Premier League', home: 'Arsenal', away: 'Chelsea', hXG: 1.85, aXG: 1.15 },
    { id: 2, league: 'La Liga', home: 'Real Madrid', away: 'Barcelona', hXG: 2.10, aXG: 1.90 },
    { id: 3, league: 'Premier League', home: 'Man City', away: 'Liverpool', hXG: 2.30, aXG: 1.60 },
    { id: 4, league: 'Serie A', home: 'Inter Milan', away: 'Juventus', hXG: 1.60, aXG: 1.05 }
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };

  const handleAuth = async (isSignUp) => {
    setStatusMsg('Processing...');
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    
    if (error) setStatusMsg(error.message);
    else if (isSignUp) setStatusMsg('Account created! Unogona kupinda izvozvi.');
  };

  return (
    <div style={{ backgroundColor: '#090d16', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif', padding: '16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '12px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: '#10b981', fontSize: '20px', fontWeight: 'bold' }}>⚡ Tech Prediction v1</h1>
        {session && (
          <button onClick={() => supabase.auth.signOut()} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}>
            Sign Out
          </button>
        )}
      </header>

      <main style={{ maxWidth: '800px', margin: '20px auto' }}>
        {!session ? (
          <div style={{ background: '#0f172a', padding: '24px', borderRadius: '12px', border: '1px solid #1e293b', maxWidth: '400px', margin: '40px auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: '18px', marginBottom: '16px' }}>Sign in to View AI Predictions</h2>
            <button onClick={handleGoogleLogin} style={{ width: '100%', padding: '10px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '8px', border: 'none', marginBottom: '12px' }}>
              Continue with Google
            </button>
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', margin: '10px 0' }}>OR WITH EMAIL</div>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '93%', padding: '10px', marginBottom: '10px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '93%', padding: '10px', marginBottom: '12px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
            {statusMsg && <div style={{ color: '#fbbf24', fontSize: '12px', marginBottom: '10px', textAlign: 'center' }}>{statusMsg}</div>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleAuth(false)} style={{ flex: 1, padding: '10px', background: '#10b981', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '6px' }}>Log In</button>
              <button onClick={() => handleAuth(true)} style={{ flex: 1, padding: '10px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px' }}>Sign Up</button>
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ color: '#10b981', fontSize: '18px', marginBottom: '16px' }}>Today's Mathematical Matches</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {matches.map(m => {
                const pred = getOddsPrediction(m.hXG, m.aXG);
                return (
                  <div key={m.id} style={{ background: '#0f172a', padding: '16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                    <div style={{ color: '#10b981', fontSize: '11px', fontWeight: 'bold' }}>{m.league}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', margin: '10px 0' }}>
                      <span>{m.home}</span>
                      <span style={{ color: '#64748b' }}>VS</span>
                      <span>{m.away}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#020617', padding: '8px', borderRadius: '6px', textAlign: 'center', fontSize: '12px', margin: '10px 0' }}>
                      <div><span style={{ color: '#94a3b8' }}>1:</span> <strong style={{ color: '#10b981' }}>{pred.homeProb}%</strong></div>
                      <div><span style={{ color: '#94a3b8' }}>X:</span> <strong style={{ color: '#f59e0b' }}>{pred.drawProb}%</strong></div>
                      <div><span style={{ color: '#94a3b8' }}>2:</span> <strong style={{ color: '#38bdf8' }}>{pred.awayProb}%</strong></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '8px' }}>
                      <span style={{ color: '#94a3b8' }}>Over 2.5: {pred.over25Prob}%</span>
                      <span style={{ background: '#10b981', color: '#020617', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>Tip: {pred.tip}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
