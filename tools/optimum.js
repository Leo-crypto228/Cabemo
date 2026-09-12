const fs = require("fs");
const src = fs.readFileSync(__dirname + "/proba.js", "utf8");
const solve = new Function(src.slice(src.indexOf("const GOAL"), src.indexOf("function pct")) + "; return solve;")();
const CIBLE = 1e-7;
const ok = [];
for (const margin of [0.10, 0.12, 0.15, 0.18, 0.20, 0.25])
  for (const maxPayout of [30, 40, 50, 60, 80, 100])
    for (const maxOdds of [2.5, 3, 4, 6, 10, 151]) {
      const p = solve({ margin, stakeFrac: 0.10, stakeAbs: 50, minStake: 5,
                        maxPayout, maxSingle: Math.min(maxOdds,151), maxComboOdds: maxOdds });
      if (p <= CIBLE) ok.push({ margin, maxPayout, maxOdds, p });
    }
// on garde, pour chaque marge, le reglage le plus permissif qui tient la cible
ok.sort((a,b) => a.margin - b.margin || b.maxPayout - a.maxPayout || b.maxOdds - a.maxOdds);
console.log("Reglages qui atteignent 1 sur 10 000 000 ou moins :\n");
console.log("marge  coteMax  gainMax   probabilite       cote d'un 50/50");
console.log("-".repeat(70));
const vu = new Set();
for (const r of ok) {
  const k = r.margin + "|" + r.maxOdds;
  if (vu.has(k)) continue; vu.add(k);
  console.log(
    String(Math.round(r.margin*100)+"%").padEnd(7) +
    String(r.maxOdds).padEnd(9) +
    String(r.maxPayout+" EUR").padEnd(10) +
    ("1 sur " + Math.round(1/r.p).toLocaleString("fr-FR")).padEnd(18) +
    ((1-r.margin)/0.5).toFixed(2));
}
if (!ok.length) console.log("(aucun reglage dans cette plage n'atteint la cible)");
