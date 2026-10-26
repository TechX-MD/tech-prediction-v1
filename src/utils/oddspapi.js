const ODDSPAPI_KEY = 'f7fe4005-d6d1-4039-8e35-ce1c1fef59a3';
const BASE_URL = 'https://api.oddspapi.io/v4';

// In-memory cache to save your 250 requests/month quota
const oddsCache = new Map();

/**
 * Fetch real odds from OddsPapi for a fixture
 */
export async function fetchOddsPapiData(homeTeam, awayTeam) {
  const cacheKey = `${homeTeam.toLowerCase()}_${awayTeam.toLowerCase()}`;
  if (oddsCache.has(cacheKey)) {
    return oddsCache.get(cacheKey);
  }

  try {
    // 1. Search for live or pre-game odds for soccer (sportId: 10)
    const response = await fetch(
      `${BASE_URL}/odds?sportId=10&bookmakers=pinnacle,bet365,1xbet&apiKey=${ODDSPAPI_KEY}`
    );

    if (!response.ok) {
      throw new Error(`OddsPapi HTTP ${response.status}`);
    }

    const data = await response.json();
    const fixtures = Array.isArray(data) ? data : data.data || [];

    // Find the matching match by team name
    const match = fixtures.find(f => {
      const h = (f.participant1Name || f.participants?.home?.name || '').toLowerCase();
      const a = (f.participant2Name || f.participants?.away?.name || '').toLowerCase();
      return (
        h.includes(homeTeam.toLowerCase()) ||
        homeTeam.toLowerCase().includes(h) ||
        a.includes(awayTeam.toLowerCase()) ||
        awayTeam.toLowerCase().includes(a)
      );
    });

    if (!match || !match.bookmakerOdds) {
      return null;
    }

    // Extract bookmaker markets
    const bookmakers = match.bookmakerOdds;
    const primaryBook = bookmakers.pinnacle || bookmakers.bet365 || Object.values(bookmakers)[0];
    if (!primaryBook || !primaryBook.markets) return null;

    let over25 = null;
    let under25 = null;
    let home1X2 = null;
    let draw1X2 = null;
    let away1X2 = null;
    let btts = null;

    // Market 1010 = Over/Under 2.5 Goals
    const ouMarket = primaryBook.markets['1010'] || primaryBook.markets['totals'];
    if (ouMarket && ouMarket.outcomes) {
      Object.values(ouMarket.outcomes).forEach(outcome => {
        const p = outcome.players?.['0'];
        const id = (p?.bookmakerOutcomeId || '').toLowerCase();
        if (id.includes('over') || id.includes('2.5/over')) over25 = p.price;
        if (id.includes('under') || id.includes('2.5/under')) under25 = p.price;
      });
    }

    // Market 101 = Full Time 1X2 Result
    const mlMarket = primaryBook.markets['101'] || primaryBook.markets['1x2'];
    if (mlMarket && mlMarket.outcomes) {
      const o = mlMarket.outcomes;
      home1X2 = o['101']?.players?.['0']?.price || o['1']?.players?.['0']?.price;
      draw1X2 = o['102']?.players?.['0']?.price || o['X']?.players?.['0']?.price;
      away1X2 = o['103']?.players?.['0']?.price || o['2']?.players?.['0']?.price;
    }

    // Market 104 = Both Teams To Score (BTTS)
    const bttsMarket = primaryBook.markets['104'];
    if (bttsMarket && bttsMarket.outcomes) {
      btts = bttsMarket.outcomes['104']?.players?.['0']?.price;
    }

    const result = {
      isApiReal: true,
      source: 'OddsPapi.io',
      over25: over25 ? parseFloat(over25).toFixed(2) : null,
      under25: under25 ? parseFloat(under25).toFixed(2) : null,
      home: home1X2 ? parseFloat(home1X2).toFixed(2) : null,
      draw: draw1X2 ? parseFloat(draw1X2).toFixed(2) : null,
      away: away1X2 ? parseFloat(away1X2).toFixed(2) : null,
      btts: btts ? parseFloat(btts).toFixed(2) : null
    };

    oddsCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('OddsPapi query note:', err.message);
    return null;
  }
}
