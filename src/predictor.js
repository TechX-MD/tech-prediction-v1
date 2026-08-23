function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function poisson(lambda, x) {
  return (Math.exp(-lambda) * Math.pow(lambda, x)) / factorial(x);
}

export function getOddsPrediction(hXG, aXG) {
  let homeWin = 0, draw = 0, awayWin = 0, over25 = 0, btts = 0;
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      let p = poisson(hXG, h) * poisson(aXG, a);
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;

      if (h + a > 2.5) over25 += p;
      if (h > 0 && a > 0) btts += p;
    }
  }

  let tip = "1X (Double Chance)";
  if (homeWin > 0.50) tip = "Home Win (1)";
  else if (awayWin > 0.45) tip = "Away Win (2)";
  else if (over25 > 0.60) tip = "Over 2.5 Goals";

  return {
    homeProb: (homeWin * 100).toFixed(1),
    drawProb: (draw * 100).toFixed(1),
    awayProb: (awayWin * 100).toFixed(1),
    over25Prob: (over25 * 100).toFixed(1),
    tip: tip
  };
}
