/* =========================================================================
   Cademo — API Node.js (Express)
   Route : POST /api/verify-account
     Body : { email: string, status: "verified" | "pending" }
     Effet : met à jour is_verified sur le profil correspondant.

   Toute la configuration passe par un fichier .env dans ce dossier
   (copie `.env.example` en `.env` puis remplis les valeurs).
   Ça marche IDENTIQUEMENT sous PowerShell, cmd et bash — plus besoin
   d'exporter les variables à la ligne de commande.

   Lancer :
     cd api
     npm install
     npm start
   ========================================================================= */

// dotenv charge .env EN PREMIER, avant les autres require. Sans crash si absent.
require("dotenv").config();
const express = require("express");

const app = express();
app.use(express.json({ limit: "20kb" }));

// Petit CORS explicite : n'accepte que ton app locale / ton domaine.
const ALLOWED_ORIGINS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://192.168.1.110:5500",
  // "https://cademo.pages.dev",   // ← ton domaine final
];
app.use((req, res, next) => {
  const o = req.headers.origin;
  if (o && ALLOWED_ORIGINS.includes(o)) {
    res.setHeader("Access-Control-Allow-Origin", o);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Cademo-Secret");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Facultatif : exige un secret partagé pour éviter qu'un tiers appelle l'API.
function requireSecret(req, res, next) {
  const expected = process.env.API_SECRET;
  if (!expected) return next();              // désactivé si non défini
  if (req.headers["x-cademo-secret"] !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

/* ------------------------------------------------------------------ back-end */
const DB = (process.env.DB || "pg").toLowerCase();

let updateVerified;                          // (email, isVerified) → Promise<{ found: bool }>

if (DB === "pg") {
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  updateVerified = async (email, isVerified) => {
    const q = "UPDATE public.profiles SET is_verified = $2 WHERE lower(email) = lower($1)";
    const { rowCount } = await pool.query(q, [email, isVerified]);
    return { found: rowCount > 0 };
  };
} else if (DB === "mongo") {
  const { MongoClient } = require("mongodb");
  const client = new MongoClient(process.env.MONGO_URL);
  const dbName = process.env.MONGO_DB || "cademo";
  const ready = client.connect().then(() => client.db(dbName).collection("profiles"));
  updateVerified = async (email, isVerified) => {
    const col = await ready;
    const r = await col.updateOne(
      { email: email.toLowerCase() },
      { $set: { isVerified } }
    );
    return { found: r.matchedCount > 0 };
  };
} else {
  console.error("DB inconnue : " + DB + " — utilise DB=pg ou DB=mongo");
  process.exit(1);
}

/* ------------------------------------------------------------------ route */
// POST /api/verify-account
// Body : { email: "user@example.com", status: "verified" | "pending" }
app.post("/api/verify-account", requireSecret, async (req, res) => {
  const { email, status } = req.body || {};

  // Validation stricte des entrées.
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "email invalide" });
  }
  if (status !== "verified" && status !== "pending") {
    return res.status(400).json({ error: 'status doit valoir "verified" ou "pending"' });
  }
  const isVerified = status === "verified";

  try {
    const { found } = await updateVerified(email.trim(), isVerified);
    if (!found) return res.status(404).json({ error: "compte introuvable" });
    return res.json({ ok: true, email: email.toLowerCase(), isVerified });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "erreur serveur" });
  }
});

app.get("/api/health", (_, res) => res.json({ ok: true, db: DB }));

/* ---------- vérification par email (mail-sender.js + confirm) ----------
   Ces routes forment le workflow complet du bouton « Vérifier mon mail »
   du profil de l'app : envoi réel de mail + validation au clic sur le lien.
   Les tokens émis sont gardés en mémoire (Map). Suffisant en dev local.  */
const validationTokens = new Map();   // token → { email, expiresAt }

app.post("/api/send-validation", requireSecret, async (req, res) => {
  try {
    const { email, userId } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "email invalide" });
    }
    const mailSender = require("./mail-sender");
    const r = await mailSender.sendValidationEmail(email, userId || email);
    if (!r.success) return res.status(502).json({ error: r.error || "envoi échoué" });
    // On mémorise le token 24h côté serveur pour valider le clic.
    validationTokens.set(r.token, { email: email.toLowerCase(), expiresAt: Date.now() + 24*3600*1000 });
    res.json({ ok: true, token: r.token, messageId: r.messageId });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

/* ------------------------------------------------------- GOOGLE OAUTH 2.0
   Vraie connexion Google native (page d'autorisation Google + popup natif
   sur le tel si l'utilisateur est connecté à son compte Google).
   Ne remplace pas l'envoi de mail — c'est un chemin ALTERNATIF.
   Config attendue dans .env :
     GOOGLE_CLIENT_ID       (App OAuth Web dans Google Cloud Console)
     GOOGLE_CLIENT_SECRET
     GOOGLE_REDIRECT_URI    (ex : http://localhost:3000/oauth/callback)
   ---------------------------------------------------------------------- */
const oauthPendingEmails = new Map();     // state → email (5 min max)

// GET /oauth/start?email=… → redirige vers la page Google d'autorisation.
app.get("/oauth/start", async (req, res) => {
  const email = String(req.query.email || "").toLowerCase();
  if (!email) return res.status(400).send("email requis");
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).send("GOOGLE_CLIENT_ID/SECRET manquants dans api/.env");
  }
  try {
    const { OAuth2Client } = require("google-auth-library");
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth/callback"
    );
    // State aléatoire lié à l'email pour éviter le CSRF, expire dans 5 min.
    const state = require("crypto").randomBytes(16).toString("hex");
    oauthPendingEmails.set(state, { email, expiresAt: Date.now() + 5*60*1000 });
    const url = client.generateAuthUrl({
      access_type: "offline",           // → refresh_token
      prompt: "consent",                // force affichage du popup natif
      login_hint: email,                // pré-remplit l'email Google
      scope: ["openid", "email", "profile"],
      state,
    });
    res.redirect(url);
  } catch (e) {
    res.status(500).send("Erreur OAuth : " + e.message);
  }
});

// GET /oauth/callback → Google renvoie ici avec ?code=… et ?state=….
// On échange le code contre les tokens, on marque le compte vérifié en base.
app.get("/oauth/callback", async (req, res) => {
  const code = String(req.query.code || "");
  const state = String(req.query.state || "");
  const errParam = String(req.query.error || "");
  if (errParam) return res.status(400).send("<h1>Autorisation refusée</h1><p>" + errParam + "</p>");
  const pending = oauthPendingEmails.get(state);
  if (!pending || pending.expiresAt < Date.now()) {
    return res.status(400).send("<h1>Session OAuth invalide ou expirée</h1><p>Recommence depuis l'app.</p>");
  }
  oauthPendingEmails.delete(state);
  try {
    const { OAuth2Client } = require("google-auth-library");
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth/callback"
    );
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    // On récupère l'email vérifié par Google (id_token).
    let googleEmail = pending.email;
    if (tokens.id_token) {
      try {
        const ticket = await client.verifyIdToken({
          idToken: tokens.id_token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload && payload.email) googleEmail = payload.email.toLowerCase();
      } catch (_) {}
    }
    // On marque le compte vérifié dans la base (updateVerified existe déjà).
    try { await updateVerified(googleEmail, true); } catch (_) {}

    res.send(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Google OAuth — Compte validé</title>
<style>body{font-family:Arial,sans-serif;background:#0B121E;color:#fff;
  min-height:100vh;margin:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;}
h1{color:#4EDEA3;font-size:28px;margin:0 0 10px;}
p{color:#B8C1D0;max-width:420px;line-height:1.5;}</style></head>
<body><div><h1>✅ Google OAuth réussi</h1>
<p>${googleEmail} — compte vérifié.<br>Le proxy IA a désormais l'accès permanent.<br>Retourne dans l'app et clique « J'ai cliqué le lien — rafraîchir ».</p></div>
<script>try{if(window.opener&&window.opener.CD)window.opener.CD.markAccountVerified();}catch(e){}</script>
</body></html>`);
  } catch (e) {
    res.status(500).send("<h1>Erreur OAuth</h1><p>" + (e.message || String(e)) + "</p>");
  }
});
/* ------------------------------------------------------ FIN GOOGLE OAUTH */

// GET /api/check-verified?email=… — l'app interroge la BASE pour savoir si
// le compte a été validé (utile après clic du lien depuis Gmail).
app.get("/api/check-verified", async (req, res) => {
  const email = String(req.query.email || "").toLowerCase();
  if (!email) return res.status(400).json({ error: "email requis" });
  try {
    if (DB === "pg") {
      const { Pool } = require("pg");
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const r = await pool.query(
        "select is_verified from public.profiles where lower(email) = $1", [email]);
      return res.json({ email, is_verified: !!(r.rows[0] && r.rows[0].is_verified) });
    }
    // Fallback mongo (jamais utilisé par Léo mais on garde le module cohérent)
    return res.json({ email, is_verified: false });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// GET /api/confirm?token=…&email=… — c'est ce que le user visite en cliquant
// dans son mail. On marque le compte vérifié et on affiche une page HTML de
// succès qui prévient l'app ouverte dans un autre onglet.
app.get("/api/confirm", async (req, res) => {
  const token = String(req.query.token || "");
  const email = String(req.query.email || "").toLowerCase();
  const entry = validationTokens.get(token);
  const okToken = entry && entry.email === email && entry.expiresAt > Date.now();

  if (!okToken) {
    return res.status(400).send("<h1>Lien invalide ou expiré</h1>");
  }
  try {
    await updateVerified(email, true);
    validationTokens.delete(token);
  } catch (e) { /* on continue quand même l'affichage */ }

  res.send(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Compte validé</title>
<style>body{font-family:Arial,sans-serif;background:#0B121E;color:#fff;
  min-height:100vh;margin:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;}
h1{color:#4EDEA3;font-size:28px;margin:0 0 10px;}
p{color:#B8C1D0;max-width:420px;line-height:1.5;}</style></head>
<body><div><h1>✅ Compte validé</h1>
<p>${email} — ton compte Cademo est maintenant vérifié.<br>Retourne dans l'app, le proxy IA a l'accès permanent.</p></div>
<script>try{if(window.opener&&window.opener.CD)window.opener.CD.markAccountVerified();}catch(e){}</script>
</body></html>`);
});
/* -------------------------------------------------------------------- */

/* --------------------------------------------- routes utilitaires admin
   Ces routes exposent nos modules (imap-check, config-store) à l'interface
   Admin de l'app. Sécurisées par API_SECRET si tu l'as défini dans .env.  */

// GET /api/inbox?limit=10 → lit les X derniers mails (via imap-check).
app.get("/api/inbox", requireSecret, async (req, res) => {
  try {
    const { checkInbox } = require("./imap-check");
    const limit = Math.min(Number(req.query.limit || 10), 50);
    const r = await checkInbox({ limit });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// GET /api/configs → liste des configs OAuth stockées (sans les tokens).
app.get("/api/configs", requireSecret, async (_, res) => {
  try {
    const { listConfigs } = require("./config-store");
    res.json(await listConfigs());
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// GET /api/config/:email → renvoie la config déchiffrée d'un compte.
app.get("/api/config/:email", requireSecret, async (req, res) => {
  try {
    const { getConfig } = require("./config-store");
    const c = await getConfig(req.params.email);
    if (!c) return res.status(404).json({ error: "introuvable" });
    res.json(c);
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// POST /api/config { email, refreshToken, ...extras } → save/update.
app.post("/api/config", requireSecret, async (req, res) => {
  try {
    const { saveConfig } = require("./config-store");
    const { email, refreshToken } = req.body || {};
    if (!email || !refreshToken) {
      return res.status(400).json({ error: "email et refreshToken requis" });
    }
    await saveConfig(req.body);
    res.json({ ok: true, email });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// DELETE /api/config/:email → suppression.
app.delete("/api/config/:email", requireSecret, async (req, res) => {
  try {
    const { deleteConfig } = require("./config-store");
    const ok = await deleteConfig(req.params.email);
    if (!ok) return res.status(404).json({ error: "introuvable" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log("Cademo API — DB=" + DB + " — écoute sur http://localhost:" + PORT);
});
