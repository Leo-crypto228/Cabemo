/* =========================================================================
   Cademo — API de vérification de compte

   Route :
     POST /api/verify-account
       Body : { "email": "...", "status": "verified" | "pending" | true | false }
       Auth : Authorization: Bearer <API_TOKEN>   (le token est côté serveur)
       Réponse : { ok: true, email, is_verified }

   Lancement local :
     cd server
     npm install
     cp .env.example .env    # puis remplis SUPABASE_* et API_TOKEN
     npm start               # écoute sur http://localhost:4000

   Sécurité :
     - La clé Supabase utilisée ici est la clé service_role (SECRÈTE).
       Elle ne sort JAMAIS vers le navigateur, elle ne vit que sur ce serveur.
     - Toute requête doit présenter le bon Authorization: Bearer <API_TOKEN>.
     - Ce fichier ne prend pas de raw SQL : Supabase ORM protège contre
       l'injection.
   ========================================================================= */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  API_TOKEN,
  PORT = 4000,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Manque SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY. Voir .env.example.");
  process.exit(1);
}
if (!API_TOKEN) {
  console.warn("[avertissement] API_TOKEN vide : la route est accessible sans auth. À corriger avant tout usage réel.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const app = express();
app.use(express.json({ limit: "8kb" }));

// --------------------------------------------------------- middleware d'auth
function requireToken(req, res, next) {
  if (!API_TOKEN) return next();            // désactivé si vide (dev only)
  const h = req.headers.authorization || "";
  if (h !== "Bearer " + API_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// ------------------------------------------------------------------- helpers
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseStatus(s) {
  if (s === true || s === "true" || s === "verified" || s === "valid" || s === 1 || s === "1") return true;
  if (s === false || s === "false" || s === "pending" || s === "unverified" || s === 0 || s === "0") return false;
  return null;
}

// ---------------------------------------------------- POST /api/verify-account
app.post("/api/verify-account", requireToken, async (req, res) => {
  const { email, status } = req.body || {};

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "email invalide" });
  }
  const verified = parseStatus(status);
  if (verified === null) {
    return res.status(400).json({ error: "status invalide (verified | pending | true | false)" });
  }

  // Update ciblé sur profiles(email). RLS bypassé par la clé service_role,
  // mais on n'expose au client QUE les champs utiles.
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_verified: verified })
    .eq("email", email.trim().toLowerCase())
    .select("id, email, is_verified")
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "compte introuvable" });

  res.json({ ok: true, email: data.email, is_verified: data.is_verified });
});

// ------------------------------------------------------------- test de vie
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "cademo-api" }));

app.listen(Number(PORT), () => {
  console.log("Cademo API sur http://localhost:" + PORT);
});
