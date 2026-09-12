/* =========================================================================
   Cademo — calcul EXACT de la probabilité d'atteindre l'objectif.

   On ne simule pas au hasard : on résout la chaîne de Markov par itération
   de valeur, en donnant au joueur la MEILLEURE stratégie possible à chaque
   solde. Le résultat est donc un PLAFOND : personne ne peut faire mieux.

   V(b) = max sur (mise, cote) de  p * V(b - mise + gain) + (1-p) * V(b - mise)
   V(b >= OBJECTIF) = 1        V(b < mise minimale) = 0

   Usage : node tools/proba.js
   ========================================================================= */

const GOAL = 2000;
const START = 200;
const STEP = 5;                 // pas de la grille de soldes, en €

// Cotes proposées sur un pari simple (le reste s'obtient en combiné).
const SINGLE_ODDS = [1.10, 1.25, 1.50, 2.00, 3.00, 5.00, 8.00, 12.0, 20.0, 30.0, 50.0, 80.0, 151.0];

function solve(cfg) {
  const { margin, stakeFrac, stakeAbs, minStake, maxPayout, maxSingle, maxComboOdds } = cfg;

  // Cotes atteignables, et nombre de jambes nécessaires pour chacune.
  // La marge se compose à chaque jambe : un combiné est bien pire qu'un simple.
  const actions = [];
  const pool = SINGLE_ODDS.filter(o => o <= maxSingle);
  const extra = [];
  for (let o = 2; o <= maxComboOdds; o *= 1.35) extra.push(Math.round(o * 100) / 100);
  const oddsSet = [...new Set([...pool, ...extra])].filter(o => o <= maxComboOdds).sort((a, b) => a - b);

  for (const o of oddsSet) {
    const legs = o <= maxSingle ? 1 : Math.ceil(Math.log(o) / Math.log(maxSingle));
    const p = Math.pow(1 - margin, legs) / o;      // proba réelle de gagner
    if (p > 0 && p < 1) actions.push({ o, p, legs });
  }

  const N = Math.floor(GOAL / STEP);               // états 0..N-1, N = gagné
  const V = new Float64Array(N + 1);
  V[N] = 1;

  // floor, pas round : sinon une perte plus petite que le pas de grille
  // ramènerait au même état et offrirait des paris gratuits au joueur.
  const idx = b => Math.min(N, Math.max(0, Math.floor(b / STEP)));

  // La mise minimale doit être un multiple du pas de grille.
  const minS = Math.max(STEP, Math.round(minStake / STEP) * STEP);

  for (let sweep = 0; sweep < 6000; sweep++) {
    let delta = 0;
    for (let i = N - 1; i >= 0; i--) {
      const bal = i * STEP;
      if (bal < minS) { V[i] = 0; continue; }

      // Mise autorisée : plafond en % du solde ET plafond absolu.
      let cap = Math.min(stakeAbs, Math.floor(bal * stakeFrac));
      cap = Math.max(minS, cap);
      cap = Math.min(cap, bal);

      let best = 0;
      for (let s = minS; s <= cap; s += STEP) {
        const lose = V[idx(bal - s)];
        for (const a of actions) {
          const gain = Math.min(s * a.o, maxPayout);
          if (gain <= s) continue;                 // aucun intérêt
          const win = V[idx(Math.min(GOAL, bal - s + gain))];
          const v = a.p * win + (1 - a.p) * lose;
          if (v > best) best = v;
        }
      }
      const d = Math.abs(best - V[i]);
      if (d > delta) delta = d;
      V[i] = best;
    }
    if (delta < 1e-18) break;
  }
  return V[idx(START)];
}

function pct(p) {
  if (p === 0) return "0 (impossible)";
  if (p >= 0.01) return (p * 100).toFixed(2) + " %";
  return (p * 100).toExponential(2) + " %  (1 sur " + Math.round(1 / p).toLocaleString("fr-FR") + ")";
}

const CIBLE = 1e-7;   // 0,00001 %

const scenarios = [
  { nom: "Actuel (aucune limite)",
    margin: 0.03, stakeFrac: 1.00, stakeAbs: 1e9, minStake: 1, maxPayout: 1e9, maxSingle: 151, maxComboOdds: 1e6 },
  { nom: "Marge 30 % seule",
    margin: 0.30, stakeFrac: 1.00, stakeAbs: 1e9, minStake: 1, maxPayout: 1e9, maxSingle: 151, maxComboOdds: 1e6 },
  { nom: "Marge 30 % + mise max 10 % du solde",
    margin: 0.30, stakeFrac: 0.10, stakeAbs: 1e9, minStake: 5, maxPayout: 1e9, maxSingle: 151, maxComboOdds: 1e6 },
  { nom: "+ gain max 500 € par ticket",
    margin: 0.30, stakeFrac: 0.10, stakeAbs: 100, minStake: 5, maxPayout: 500, maxSingle: 151, maxComboOdds: 50 },
  { nom: "+ marge 35 %, mise max 5 %",
    margin: 0.35, stakeFrac: 0.05, stakeAbs: 50, minStake: 5, maxPayout: 300, maxSingle: 30, maxComboOdds: 25 },
  { nom: "Verrouillé : marge 40 %, mise max 5 %, gain max 200 €",
    margin: 0.40, stakeFrac: 0.05, stakeAbs: 40, minStake: 5, maxPayout: 200, maxSingle: 20, maxComboOdds: 15 },
];

console.log("Objectif : atteindre " + GOAL + " € en partant de " + START + " €");
console.log("Cible visée : " + pct(CIBLE) + "\n");
console.log("Réglage".padEnd(46) + "Probabilité (meilleur joueur possible)");
console.log("-".repeat(96));
for (const s of scenarios) {
  const p = solve(s);
  const flag = p <= CIBLE ? "  <-- OK" : "";
  console.log(s.nom.padEnd(46) + pct(p) + flag);
}
