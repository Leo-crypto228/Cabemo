/* =========================================================================
   Cademo — helper pour SAUVEGARDER une config OAuth (email + refreshToken).

   Deux back-ends interchangeables, choisis par CONFIG_STORE dans .env :

     • "file"  → fichier JSON local CHIFFRÉ (AES-256-GCM).
                 Contenu illisible sans MASTER_KEY.
                 Permissions restreintes automatiquement (0600 sur POSIX).

     • "pg"    → table `oauth_configs` en Postgres (Supabase).
                 Le secret est stocké en JSONB chiffré (jamais en clair en base).

   Le refreshToken n'apparaît JAMAIS en clair sur disque ni en DB.
   Seule MASTER_KEY (32 octets aléatoires, en hex) peut le déchiffrer.

   API :
     await saveConfig({ email, refreshToken, ...extras })
     await getConfig(email)          // → { email, refreshToken, ...extras } ou null
     await deleteConfig(email)       // → true si supprimé
     await listConfigs()             // → liste d'emails, sans les tokens

   CLI (pour tester) :
     node config-store.js save   user@example.com  1//abc123
     node config-store.js get    user@example.com
     node config-store.js list
     node config-store.js delete user@example.com
   ========================================================================= */

require("dotenv").config();
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const STORE   = (process.env.CONFIG_STORE || "file").toLowerCase();
const FILE    = process.env.CONFIG_FILE || path.join(__dirname, ".config-store.json");
const MASTER  = process.env.MASTER_KEY;

if (!MASTER) {
  throw new Error(
    "MASTER_KEY manquant dans .env.\n" +
    "Génère-en une avec :\n" +
    '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

// La clé de chiffrement est DÉRIVÉE de MASTER_KEY (scrypt).
// Comme ça, MASTER_KEY peut être une chaîne hex, base64, un mot de passe fort…
// On aboutit toujours à 32 octets, ce qu'il faut pour AES-256.
const KEY = crypto.scryptSync(MASTER, "cademo-config-salt-v1", 32);

/* ------------------------------------------------------ chiffrement AES-GCM */
function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ct: enc.toString("base64"),
  };
}
function decrypt(box) {
  const iv  = Buffer.from(box.iv,  "base64");
  const tag = Buffer.from(box.tag, "base64");
  const ct  = Buffer.from(box.ct,  "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ct), decipher.final()]);
  return dec.toString("utf8");
}

/* ==================================================== back-end FICHIER JSON */
const fileBackend = {
  async load() {
    if (!fs.existsSync(FILE)) return { version: 1, entries: {} };
    const raw = fs.readFileSync(FILE, "utf8");
    try { return JSON.parse(raw); } catch (e) { return { version: 1, entries: {} }; }
  },
  async persist(state) {
    // Écriture atomique : on écrit à côté, puis on renomme.
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, FILE);
    // Sur POSIX ça restreint aussi le fichier final au propriétaire.
    // Sur Windows, chmod est essentiellement ignoré — l'ACL est celle du parent.
    try { fs.chmodSync(FILE, 0o600); } catch (_) {}
  },
  async save(entry) {
    const state = await this.load();
    const enc = encrypt(JSON.stringify(entry));
    state.entries[entry.email.toLowerCase()] = {
      email: entry.email.toLowerCase(),
      secret: enc,
      updated_at: new Date().toISOString(),
    };
    await this.persist(state);
    return true;
  },
  async get(email) {
    const state = await this.load();
    const row = state.entries[email.toLowerCase()];
    if (!row) return null;
    return JSON.parse(decrypt(row.secret));
  },
  async delete(email) {
    const state = await this.load();
    const key = email.toLowerCase();
    if (!state.entries[key]) return false;
    delete state.entries[key];
    await this.persist(state);
    return true;
  },
  async list() {
    const state = await this.load();
    return Object.values(state.entries).map(r => ({
      email: r.email, updated_at: r.updated_at,
    }));
  },
};

/* ============================================================ back-end PG */
// Table :
//   create table if not exists public.oauth_configs (
//     email       text primary key,
//     secret      jsonb not null,
//     updated_at  timestamptz not null default now()
//   );
//   alter table public.oauth_configs enable row level security;
//   -- Accès uniquement via service_role côté serveur (jamais depuis le client).
let pgPool;
function getPgPool() {
  if (pgPool) return pgPool;
  const { Pool } = require("pg");
  pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pgPool;
}
const pgBackend = {
  async save(entry) {
    const pool = getPgPool();
    const enc = encrypt(JSON.stringify(entry));
    await pool.query(
      `insert into public.oauth_configs (email, secret, updated_at)
       values ($1, $2, now())
       on conflict (email) do update
         set secret = excluded.secret, updated_at = now()`,
      [entry.email.toLowerCase(), enc]
    );
    return true;
  },
  async get(email) {
    const pool = getPgPool();
    const { rows } = await pool.query(
      "select secret from public.oauth_configs where email = $1",
      [email.toLowerCase()]
    );
    if (!rows.length) return null;
    return JSON.parse(decrypt(rows[0].secret));
  },
  async delete(email) {
    const pool = getPgPool();
    const { rowCount } = await pool.query(
      "delete from public.oauth_configs where email = $1",
      [email.toLowerCase()]
    );
    return rowCount > 0;
  },
  async list() {
    const pool = getPgPool();
    const { rows } = await pool.query(
      "select email, updated_at from public.oauth_configs order by updated_at desc"
    );
    return rows;
  },
};

/* ------------------------------------------------------------- interface publique */
const backend = STORE === "pg" ? pgBackend : fileBackend;

async function saveConfig(entry) {
  if (!entry || typeof entry.email !== "string" || !entry.email) {
    throw new Error("saveConfig : email requis");
  }
  if (!entry.refreshToken || typeof entry.refreshToken !== "string") {
    throw new Error("saveConfig : refreshToken requis");
  }
  return backend.save(entry);
}
async function getConfig(email)    { return backend.get(email); }
async function deleteConfig(email) { return backend.delete(email); }
async function listConfigs()       { return backend.list(); }

module.exports = { saveConfig, getConfig, deleteConfig, listConfigs };

/* ------------------------------------------------------------------- CLI */
if (require.main === module) {
  const [, , cmd, ...args] = process.argv;
  (async () => {
    try {
      switch (cmd) {
        case "save": {
          const [email, refreshToken] = args;
          if (!email || !refreshToken) throw new Error("usage: save <email> <refreshToken>");
          await saveConfig({ email, refreshToken });
          console.log("OK — sauvegardé (chiffré) : " + email);
          break;
        }
        case "get": {
          const [email] = args;
          if (!email) throw new Error("usage: get <email>");
          const c = await getConfig(email);
          if (!c) { console.log("(introuvable)"); process.exit(2); }
          console.log(JSON.stringify(c, null, 2));
          break;
        }
        case "delete": {
          const [email] = args;
          if (!email) throw new Error("usage: delete <email>");
          console.log(await deleteConfig(email) ? "supprimé" : "(introuvable)");
          break;
        }
        case "list": {
          const rows = await listConfigs();
          if (!rows.length) console.log("(vide)");
          else rows.forEach(r => console.log(r.email + "   " + r.updated_at));
          break;
        }
        default:
          console.log("commandes : save | get | delete | list");
          console.log('exemple  : node config-store.js save user@example.com "1//abc123"');
      }
      process.exit(0);
    } catch (e) {
      console.error("Erreur : " + (e && e.message || e));
      process.exit(1);
    }
  })();
}
