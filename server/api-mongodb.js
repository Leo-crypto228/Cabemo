/* =========================================================================
   Cademo — API de vérification de compte (variante MongoDB)

   Même contrat que api.js (Supabase), mais tape dans une base MongoDB.
   Utilise UNIQUEMENT si tu bascules Cademo sur MongoDB (aujourd'hui : Supabase).

   Route :
     POST /api/verify-account
       Body : { "email": "...", "status": "verified" | "pending" | true | false }
       Auth : Authorization: Bearer <API_TOKEN>

   Lancement :
     cd server
     npm install mongodb                       # en plus de ce qui est déjà installé
     export MONGODB_URI="mongodb+srv://…"
     export MONGODB_DB=cademo
     export API_TOKEN=… PORT=4000
     node api-mongodb.js
   ========================================================================= */

import express from "express";
import { MongoClient } from "mongodb";
import "dotenv/config";

const {
  MONGODB_URI,
  MONGODB_DB = "cademo",
  API_TOKEN,
  PORT = 4000,
} = process.env;

if (!MONGODB_URI) {
  console.error("Manque MONGODB_URI.");
  process.exit(1);
}

const mongo = new MongoClient(MONGODB_URI);
await mongo.connect();
const profiles = mongo.db(MONGODB_DB).collection("profiles");
// Index unique sur email pour éviter les doublons + accélérer la recherche.
await profiles.createIndex({ email: 1 }, { unique: true });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function parseStatus(s) {
  if (s === true || s === "true" || s === "verified" || s === "valid" || s === 1 || s === "1") return true;
  if (s === false || s === "false" || s === "pending" || s === "unverified" || s === 0 || s === "0") return false;
  return null;
}

const app = express();
app.use(express.json({ limit: "8kb" }));

app.post("/api/verify-account", (req, res, next) => {
  if (!API_TOKEN) return next();
  const h = req.headers.authorization || "";
  if (h !== "Bearer " + API_TOKEN) return res.status(401).json({ error: "unauthorized" });
  next();
}, async (req, res) => {
  const { email, status } = req.body || {};
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "email invalide" });
  }
  const verified = parseStatus(status);
  if (verified === null) {
    return res.status(400).json({ error: "status invalide" });
  }

  const now = new Date();
  const result = await profiles.findOneAndUpdate(
    { email: email.trim().toLowerCase() },
    { $set: { isVerified: verified, verifiedAt: verified ? now : null, updatedAt: now } },
    { returnDocument: "after", projection: { _id: 0, email: 1, isVerified: 1 } }
  );

  if (!result) return res.status(404).json({ error: "compte introuvable" });
  res.json({ ok: true, email: result.email, is_verified: result.isVerified });
});

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "cademo-api-mongodb" }));

app.listen(Number(PORT), () => {
  console.log("Cademo API (Mongo) sur http://localhost:" + PORT);
});
