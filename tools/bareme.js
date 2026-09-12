/* =========================================================================
   Cademo — génère le barème de cotes définitif et le revérifie.

   1. On part de la probabilité RÉELLE de chaque pari.
   2. On applique la marge maison : cote = (1 - marge) / p.
   3. Garde-fous :
      - une cote inférieure à 1.05 n'est pas affichable -> le côté est retiré
      - un côté dont l'espérance dépasse 1 serait exploitable -> retiré
   4. On recalcule la probabilité exacte d'atteindre 2000 € avec ce barème.
   ========================================================================= */

const MARGE      = 0.15;   // marge maison
const GAIN_MAX   = 45;     // gain maximum par ticket, en €
const MISE_MAX   = 50;     // mise maximum absolue, en €
const MISE_FRAC  = 0.10;   // ... et au plus 10 % du solde
const MISE_MIN   = 5;
const COTE_MIN   = 1.05;

// Probabilité réelle du côté "oui / plus" de chaque marché.
const MARCHES = [
  // --- Football -----------------------------------------------------------
  ["fb-1", "foot", "Kylian Mbappé", "PSG vs Dortmund • Champions League", "Buts marqués (total)", "1.5", 0.32, "Less", "More"],
  ["fb-2", "foot", "Erling Haaland", "Man City vs Arsenal • Premier League", "Buts marqués (total)", "0.5", 0.63, "Less", "More"],
  ["fb-3", "foot", "Plus de 2.5 buts", "Real Madrid vs FC Barcelone • Liga", "Buts du match", "2.5", 0.55, "Less", "More"],
  ["fb-4", "foot", "Match à 4 cartons ou +", "Juventus vs Milan • Serie A", "Cartons du match", "3.5", 0.47, "Less", "More"],
  ["fb-v1", "foot", "Un défenseur central marque un doublé", "Toutes affiches • Journée en cours", "Doublé d'un défenseur", null, 0.013, "Non", "Oui"],
  ["fb-v2", "foot", "Le gardien marque dans le temps additionnel", "Toutes affiches • 90'+", "Gardien buteur", null, 0.0056, "Non", "Oui"],
  ["fb-v3", "foot", "Un remplaçant entré à la 85e met le but de la victoire", "Toutes affiches • 85'+", "Entrant décisif", null, 0.025, "Non", "Oui"],
  ["fb-v4", "foot", "Une équipe de bas de tableau colle 4 buts à un cador", "Toutes affiches • Journée en cours", "4 buts du mal classé", null, 0.029, "Non", "Oui"],
  // --- Formule 1 ----------------------------------------------------------
  ["f1-1", "f1", "Max Verstappen", "Grand Prix • Vainqueur de la course", "Victoire", null, 0.62, "No", "Yes"],
  ["f1-2", "f1", "Charles Leclerc", "Grand Prix • Qualifications", "Position en qualif", "2.5", 0.53, "Less", "More"],
  ["f1-3", "f1", "Lando Norris", "Grand Prix • Meilleur tour", "Signe le meilleur tour", null, 0.185, "No", "Yes"],
  ["f1-4", "f1", "George Russell", "Grand Prix • Arrivée", "Termine dans le top 5", null, 0.355, "No", "Yes"],
  ["f1-v1", "f1", "Une Haas monte sur le podium", "Grand Prix • Fond de grille", "Podium d'un fond de grille", null, 0.021, "Non", "Oui"],
  ["f1-v2", "f1", "Un pilote parti dernier finit dans les points", "Grand Prix • Remontée", "Dernier sur la grille → top 10", null, 0.046, "Non", "Oui"],
  ["f1-v3", "f1", "Un rookie signe le meilleur tour de la course", "Grand Prix • Meilleur tour", "Meilleur tour d'un rookie", null, 0.033, "Non", "Oui"],
  ["f1-v4", "f1", "Un pilote en galère bat son coéquipier champion en qualif", "Grand Prix • Duel interne", "Duel de coéquipiers", null, 0.109, "Non", "Oui"],
  // --- Basket -------------------------------------------------------------
  ["nb-1", "nba", "Victor Wembanyama", "Spurs vs Lakers", "Points + rebonds", "32.5", 0.50, "Less", "More"],
  ["nb-2", "nba", "G. Antetokounmpo", "Bucks vs Celtics", "Points", "32.5", 0.50, "Less", "More"],
  ["nb-3", "nba", "A. Edwards", "Wolves vs Pacers", "3 points marqués", "4.5", 0.48, "Less", "More"],
  ["nb-4", "nba", "N. Jokic", "Nuggets vs Suns", "Rebonds", "12.5", 0.51, "Less", "More"],
  ["nb-5", "nba", "T. Haliburton", "Pacers vs Knicks", "Passes décisives", "9.5", 0.49, "Less", "More"],
  ["nb-v1", "nba", "Un joueur du banc score 30+", "Toutes affiches • Sortie du banc", "30 points depuis le banc", "29.5", 0.058, "Non", "Oui"],
  ["nb-v2", "nba", "Le pire shooteur à 3 pts de l'équipe en rentre 5", "Toutes affiches • Adresse extérieure", "5 tirs à 3 points", "4.5", 0.023, "Non", "Oui"],
  ["nb-v3", "nba", "Le dernier de la conférence bat le leader de 20+", "Toutes affiches • Écart final", "Écart de 20 points", "19.5", 0.037, "Non", "Oui"],
];

const COULEURS = {
  "fb-1":"#0B1C4B","fb-2":"#6CABDD","fb-3":"#1D4ED8","fb-4":"#CA8A04",
  "fb-v1":"#7F1D1D","fb-v2":"#166534","fb-v3":"#4C1D95","fb-v4":"#9A3412",
  "f1-1":"#0600EF","f1-2":"#DC0000","f1-3":"#FF8700","f1-4":"#00A19C",
  "f1-v1":"#4A4A4A","f1-v2":"#2F2F2F","f1-v3":"#2A6E3F","f1-v4":"#6B21A8",
  "nb-1":"#1B1B1B","nb-2":"#00471B","nb-3":"#0C2340","nb-4":"#0E2240","nb-5":"#FDBB30",
  "nb-v1":"#3F3F46","nb-v2":"#7C2D12","nb-v3":"#581C87",
};

const arrondi = o => Math.round(o * 100) / 100;

// ---------------------------------------------------------------- barème
const paris = [];          // { p, o } réellement proposés au joueur
const sorties = [];

for (const [id, sport, qui, match, marche, ligne, pOui, lNon, lOui] of MARCHES) {
  const cote = p => arrondi((1 - MARGE) / p);
  const cotes = { less: cote(1 - pOui), more: cote(pOui) };
  const probas = { less: 1 - pOui, more: pOui };
  const garde = {};

  for (const side of ["less", "more"]) {
    const o = cotes[side], p = probas[side];
    if (o < COTE_MIN) { garde[side] = null; continue; }   // cote inaffichable
    if (p * o >= 1)   { garde[side] = null; continue; }   // espérance exploitable
    garde[side] = o;
    paris.push({ p, o });
  }
  sorties.push({ id, sport, qui, match, marche, ligne, lNon, lOui, garde, probas });
}

// ------------------------------------------------- probabilité exacte
const GOAL = 2000, START = 200, STEP = 5;
const maxSingle = Math.max(...paris.map(x => x.o));
const maxEV     = Math.max(...paris.map(x => x.p * x.o));

// Pour chaque cote atteignable, la MEILLEURE probabilité possible pour le joueur.
const actions = [];
const echelle = new Set(paris.map(x => x.o));
for (let k = 2; k <= 4; k++)
  for (const o of [...echelle]) { const v = arrondi(Math.pow(o, k)); if (v <= 5000) echelle.add(v); }
for (const o of [...echelle].sort((a, b) => a - b)) {
  const legs = o <= maxSingle ? 1 : Math.ceil(Math.log(o) / Math.log(maxSingle));
  const p = Math.pow(maxEV, legs) / o;    // hypothèse la plus favorable au joueur
  if (p > 0 && p < 1) actions.push({ o, p });
}

const N = GOAL / STEP;
const V = new Float64Array(N + 1); V[N] = 1;
const idx = b => Math.min(N, Math.max(0, Math.floor(b / STEP)));
for (let sweep = 0; sweep < 6000; sweep++) {
  let delta = 0;
  for (let i = N - 1; i >= 0; i--) {
    const bal = i * STEP;
    if (bal < MISE_MIN) { V[i] = 0; continue; }
    let cap = Math.min(MISE_MAX, Math.floor(bal * MISE_FRAC));
    cap = Math.min(Math.max(MISE_MIN, cap), bal);
    let best = 0;
    for (let s = MISE_MIN; s <= cap; s += STEP) {
      const perd = V[idx(bal - s)];
      for (const a of actions) {
        const gain = Math.min(s * a.o, GAIN_MAX);
        if (gain <= s) continue;
        const gagne = V[idx(Math.min(GOAL, bal - s + gain))];
        const v = a.p * gagne + (1 - a.p) * perd;
        if (v > best) best = v;
      }
    }
    const d = Math.abs(best - V[i]); if (d > delta) delta = d;
    V[i] = best;
  }
  if (delta < 1e-18) break;
}
const P = V[idx(START)];

// ------------------------------------------------------------- rapport
console.log("MARGE " + (MARGE*100) + " %   GAIN MAX " + GAIN_MAX + " EUR   MISE MAX " + MISE_MAX + " EUR (10 % du solde)\n");
console.log("Cote la plus haute proposee : " + maxSingle.toFixed(2));
console.log("Esperance du meilleur pari  : " + maxEV.toFixed(4) + "  (doit rester < 1)");
const retires = sorties.filter(s => !s.garde.less || !s.garde.more);
console.log("Cotes retirees (inaffichables ou exploitables) : " + retires.length + " cote(s) sur " + sorties.length + " marches");
console.log("\n>>> Probabilite d'atteindre 2000 EUR, MEILLEUR joueur possible :");
console.log("    " + (P*100).toExponential(2) + " %   =   1 chance sur " + Math.round(1/P).toLocaleString("fr-FR"));
console.log("    (cible de Leo : 0,00001 % = 1 sur 10 000 000)\n");

// ------------------------------------------------- catalogue prêt à coller
const parSport = { foot: [], f1: [], nba: [] };
for (const s of sorties) {
  const côté = (side, label) => s.garde[side] === null ? "null"
    : '{l:"' + label + '",o:' + s.garde[side].toFixed(2) + ',p:' + s.probas[side] + '}';
  parSport[s.sport].push(
    '        { id:"' + s.id + '", cat:"' + (s.id.includes("-v") ? "value" : "trending") + '", who:"' + s.qui.replace(/"/g,'\\"') + '",\n' +
    '          match:"' + s.match + '", market:"' + s.marche + '", line:' + (s.ligne ? '"' + s.ligne + '"' : "null") + ', c:"' + COULEURS[s.id] + '",\n' +
    '          less:' + côté("less", s.lNon) + ', more:' + côté("more", s.lOui) + ' }');
}
require("fs").writeFileSync(__dirname + "/catalogue.txt",
  Object.keys(parSport).map(k => "/* === " + k + " === */\n" + parSport[k].join(",\n")).join("\n\n"), "utf8");
console.log("Catalogue ecrit dans tools/catalogue.txt");
