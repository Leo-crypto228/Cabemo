/* Recherche des réglages qui amènent la probabilité à 1 sur 10 000 000. */
const { execSync } = require("child_process");
const fs = require("fs");

const src = fs.readFileSync(__dirname + "/proba.js", "utf8");
const solveSrc = src.slice(src.indexOf("const GOAL"), src.indexOf("function pct"));
const solve = new Function(solveSrc + "; return solve;")();

const CIBLE = 1e-7;
const base = { minStake: 5 };

const grid = [];
for (const margin of [0.25, 0.30, 0.35])
  for (const stakeFrac of [0.05, 0.08, 0.10])
    for (const maxPayout of [100, 150, 200, 300])
      for (const maxSingle of [151])
        grid.push({ margin, stakeFrac, stakeAbs: 50, minStake: 5,
                    maxPayout, maxSingle, maxComboOdds: 151 });

const rows = grid.map(c => ({ c, p: solve(c) }));
rows.sort((a, b) => a.p - b.p);

const fmt = p => p === 0 ? "0" :
  (p >= 1e-4 ? (p * 100).toFixed(4) + " %" : "1 sur " + Math.round(1 / p).toLocaleString("fr-FR"));

console.log("marge  mise%  gainMax   probabilité");
console.log("-".repeat(56));
for (const r of rows) {
  const near = Math.abs(Math.log10(r.p) - Math.log10(CIBLE)) < 0.7 ? "  <== cible" : "";
  console.log(
    String(Math.round(r.c.margin * 100) + "%").padEnd(7) +
    String(Math.round(r.c.stakeFrac * 100) + "%").padEnd(7) +
    String(r.c.maxPayout + " EUR").padEnd(10) +
    fmt(r.p) + near);
}
