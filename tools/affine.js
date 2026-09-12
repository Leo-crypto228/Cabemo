const fs = require("fs");
const src = fs.readFileSync(__dirname + "/proba.js", "utf8");
const solve = new Function(src.slice(src.indexOf("const GOAL"), src.indexOf("function pct")) + "; return solve;")();
const CIBLE = 1e-7;
const rows = [];
for (const margin of [0.32, 0.35, 0.38, 0.40])
  for (const maxPayout of [80, 90, 100, 110, 120])
    for (const stakeAbs of [25, 50])
      rows.push({ margin, maxPayout, stakeAbs,
        p: solve({ margin, stakeFrac: 0.10, stakeAbs, minStake: 5,
                   maxPayout, maxSingle: 151, maxComboOdds: 151 }) });
rows.sort((a,b) => Math.abs(Math.log10(a.p||1e-30)-Math.log10(CIBLE)) - Math.abs(Math.log10(b.p||1e-30)-Math.log10(CIBLE)));
console.log("marge  gainMax  miseMax   probabilite            ecart a la cible");
console.log("-".repeat(72));
for (const r of rows.slice(0, 14)) {
  const un = r.p ? Math.round(1/r.p) : Infinity;
  console.log(
    String(Math.round(r.margin*100)+"%").padEnd(7) +
    String(r.maxPayout+" EUR").padEnd(9) +
    String(r.stakeAbs+" EUR").padEnd(10) +
    ("1 sur " + un.toLocaleString("fr-FR")).padEnd(23) +
    "x" + (r.p/CIBLE).toFixed(2));
}
