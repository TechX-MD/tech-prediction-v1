import React from 'react';

export default function Header({ currentUser, isAdmin, onLogout, onOpenSignIn }) {
  return (
    <header style={{ borderBottom: '1px solid #0f3822', background: '#05180f', position: 'sticky', top: 0, zIndex: 40 }}>
      <div style={{ maxWidth: '650px', margin: '0 auto', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '900', color: '#22c55e', margin: 0, letterSpacing: '0.5px' }}>
            ⚡ TECH TV PREDICTOR <span style={{ fontSize: '10px', background: '#22c55e', color: '#020d07', padding: '1px 5px', borderRadius: '4px' }}>PRO</span>
          </h1>
          <div style={{ fontSize: '10px', color: '#86efac', opacity: 0.85 }}>Live Football Match Tracker & Odds Hub</div>
        </div>
        <div>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#86efac', fontWeight: 'bold' }}>
                👤 {currentUser.split('@')[0]}
              </span>
              {isAdmin && (
                <span style={{ fontSize: '9px', background: '#eab308', color: '#020d07', fontWeight: '900', padding: '2px 6px', borderRadius: '4px' }}>
                  ADMIN
                </span>
              )}
              <button
                onClick={onLogout}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenSignIn}
              style={{
                background: '#22c55e',
                color: '#020d07',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
