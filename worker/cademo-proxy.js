/* =========================================================================
   Cademo — relais d'API (Cloudflare Worker)

   POURQUOI : les clés football-data et balldontlie ne doivent jamais être
   dans la page (n'importe qui les lirait). Ce Worker les garde côté serveur,
   met les réponses en cache (le tier foot gratuit = 10 req/min) et n'expose
   au navigateur QUE les données utiles, déjà simplifiées.

   DÉPLOIEMENT (une fois) :
     1. cloudflare.com → Workers & Pages → Create → Worker → colle ce fichier
     2. Settings → Variables → ajoute deux "secrets" :
          FOOTBALL_DATA_KEY = 4af5c0e6fa52437bb2bf50bfbb2f106f
          BALLDONTLIE_KEY   = 159e5d08-5dfe-4923-949c-3c4a74b72487
        (les clés vivent là, PAS dans le code — ne les recolle pas ici)
     3. Déploie. Tu obtiens une URL du type
          https://cademo-proxy.TON-COMPTE.workers.dev
     4. Reporte cette URL dans index.html -> var PROXY_URL = "...".

   Le Worker répond en JSON à :
     /foot/matches?comp=FL1     -> prochains matchs d'une compétition
     /foot/scorers?comp=PL      -> classement des buteurs
     /nba/games                 -> derniers matchs NBA (scores)
   ========================================================================= */

const CACHE_TTL = 300; // secondes : on ne rappelle pas l'API plus d'1x / 5 min

// N'autorise que TON site à appeler le Worker (anti-abus). Ajoute ton domaine.
const ALLOWED_ORIGINS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://cademo.pages.dev",     // <- remplace par ton domaine Cloudflare Pages
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    try {
      let payload;
      if (url.pathname === "/foot/matches") {
        payload = await footMatches(url.searchParams.get("comp") || "FL1", env);
      } else if (url.pathname === "/foot/scorers") {
        payload = await footScorers(url.searchParams.get("comp") || "PL", env);
      } else if (url.pathname === "/nba/games") {
        payload = await nbaGames(env);
      } else {
        return json({ error: "route inconnue" }, 404, cors);
      }
      return json(payload, 200, cors);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 502, cors);
    }
  }
};

/* ---------------------------------------------------------------- helpers */
function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8",
               "Cache-Control": "public, max-age=" + CACHE_TTL, ...cors },
  });
}

// Cache Cloudflare partagé entre tous les visiteurs -> protège le quota.
async function cached(key, ttl, producer) {
  const cache = caches.default;
  const cacheKey = new Request("https://cache.cademo/" + key);
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();
  const data = await producer();
  const resp = new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json",
               "Cache-Control": "public, max-age=" + ttl },
  });
  await cache.put(cacheKey, resp.clone());
  return data;
}

/* ------------------------------------------------------------------ FOOT */
async function footMatches(comp, env) {
  return cached("foot-matches-" + comp, CACHE_TTL, async () => {
    const r = await fetch(
      "https://api.football-data.org/v4/competitions/" + comp + "/matches?status=SCHEDULED",
      { headers: { "X-Auth-Token": env.FOOTBALL_DATA_KEY } });
    if (!r.ok) throw new Error("football-data " + r.status);
    const d = await r.json();
    const matches = (d.matches || []).slice(0, 20).map((m) => ({
      id: m.id,
      date: m.utcDate,
      home: m.homeTeam.shortName || m.homeTeam.name,
      away: m.awayTeam.shortName || m.awayTeam.name,
      comp: d.competition ? d.competition.name : comp,
    }));
    return { competition: comp, matches };
  });
}

async function footScorers(comp, env) {
  return cached("foot-scorers-" + comp, 3600, async () => {
    const r = await fetch(
      "https://api.football-data.org/v4/competitions/" + comp + "/scorers",
      { headers: { "X-Auth-Token": env.FOOTBALL_DATA_KEY } });
    if (!r.ok) throw new Error("football-data " + r.status);
    const d = await r.json();
    const scorers = (d.scorers || []).slice(0, 10).map((s) => ({
      name: s.player.name, team: s.team.shortName || s.team.name, goals: s.goals,
    }));
    return { competition: comp, scorers };
  });
}

/* ------------------------------------------------------------------- NBA */
async function nbaGames(env) {
  return cached("nba-games", CACHE_TTL, async () => {
    const r = await fetch("https://api.balldontlie.io/v1/games?per_page=10",
      { headers: { "Authorization": env.BALLDONTLIE_KEY } });
    if (!r.ok) throw new Error("balldontlie " + r.status);
    const d = await r.json();
    const games = (d.data || []).map((g) => ({
      id: g.id, date: g.date, status: g.status,
      home: g.home_team.full_name, home_score: g.home_team_score,
      away: g.visitor_team.full_name, away_score: g.visitor_team_score,
    }));
    return { games };
  });
}
