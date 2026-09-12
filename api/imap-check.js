/* =========================================================================
   Cademo — module Node.js indépendant : vérifier une boîte de réception IMAP.

   Deux modes d'authentification, choisis par IMAP_MODE (dans .env) :
     • "password"  → identifiants classiques (utilisateur + mot de passe /
                     App Password Gmail par exemple)
     • "oauth2"    → jeton d'accès Google via google-auth-library
                     (rafraîchi automatiquement depuis un refresh token)

   La config passe UNIQUEMENT par les variables d'environnement — voir
   .env.example dans ce dossier pour toutes les clés.

   Utilisation :
     - En CLI :   npm run imap          (imprime les N derniers messages)
     - Comme lib : const { checkInbox } = require("./imap-check");
                   const msgs = await checkInbox({ limit: 20 });

   Sortie : tableau d'objets { uid, from, subject, date, seen, flags }.
   ========================================================================= */

require("dotenv").config();
const { ImapFlow } = require("imapflow");

/* ---------------------------------------------- helpers d'environnement */
function need(name) {
  const v = process.env[name];
  if (!v) throw new Error(
    "\n\n  IMAP : il manque « " + name + " » dans C:\\Users\\Leo\\cademo\\api\\.env\n" +
    "  Ouvre ce fichier dans Notepad et remplis les lignes IMAP_HOST / IMAP_USER /\n" +
    "  IMAP_PASSWORD (App Password Gmail 16 caractères sans espace).\n" +
    "  Voir aussi .env.example dans le même dossier pour un modèle.\n"
  );
  return v;
}
function opt(name, fallback) {
  return process.env[name] || fallback;
}
function bool(name, fallback) {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === "1" || /^true$/i.test(v);
}

/* --------------------------------------------- OAuth2 (Google, si demandé) */
// Rafraîchit un access_token à partir d'un refresh_token via google-auth-library.
// L'access_token vit 1h et est demandé à chaque appel — la bibliothèque le
// met en cache tant qu'il est valide, donc c'est bon marché.
async function getGoogleAccessToken() {
  const { OAuth2Client } = require("google-auth-library");
  const client = new OAuth2Client(
    need("GOOGLE_CLIENT_ID"),
    need("GOOGLE_CLIENT_SECRET")
  );
  client.setCredentials({ refresh_token: need("GOOGLE_REFRESH_TOKEN") });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("google-auth-library : access_token vide");
  return token;
}

/* ------------------------------------- construction du client selon le mode */
async function buildClient() {
  const mode = (opt("IMAP_MODE", "password") || "").toLowerCase();
  const host = need("IMAP_HOST");                   // ex. imap.gmail.com
  const port = Number(opt("IMAP_PORT", 993));
  const secure = bool("IMAP_SECURE", true);
  const user = need("IMAP_USER");                   // adresse email
  const logger = bool("IMAP_LOG", false) ? undefined : false;

  let auth;
  if (mode === "oauth2") {
    const accessToken = await getGoogleAccessToken();
    auth = { user, accessToken };
  } else if (mode === "password") {
    auth = { user, pass: need("IMAP_PASSWORD") };
  } else {
    throw new Error('IMAP_MODE doit valoir "password" ou "oauth2"');
  }
  return new ImapFlow({ host, port, secure, auth, logger });
}

/* ------------------------------------------------------------ API publique */
async function checkInbox(options) {
  options = options || {};
  const limit = Number(options.limit || opt("IMAP_LIMIT", 10));
  const mailbox = options.mailbox || opt("IMAP_MAILBOX", "INBOX");

  const client = await buildClient();
  await client.connect();

  const messages = [];
  try {
    const lock = await client.getMailboxLock(mailbox);
    try {
      const status = client.mailbox;   // objet renseigné par getMailboxLock
      // On lit les `limit` derniers UID par ordre décroissant.
      const total = status.exists || 0;
      if (total === 0) return { mailbox, total: 0, unseen: 0, messages: [] };

      const seq = Math.max(1, total - limit + 1) + ":*";
      for await (const msg of client.fetch(seq, {
        envelope: true, flags: true, uid: true, internalDate: true,
      })) {
        messages.push({
          uid: msg.uid,
          from: (msg.envelope.from || [])
                  .map(a => a.name ? `${a.name} <${a.address}>` : a.address)
                  .join(", "),
          subject: msg.envelope.subject || "(sans sujet)",
          date: (msg.envelope.date || msg.internalDate || new Date()).toISOString(),
          seen: msg.flags && msg.flags.has ? msg.flags.has("\\Seen") : false,
          flags: msg.flags ? Array.from(msg.flags) : [],
        });
      }
      // ordre inverse : le plus récent en premier
      messages.reverse();

      // Nombre de non lus dans toute la boîte (pas juste dans la fenêtre).
      const unseenList = await client.search({ seen: false });
      return {
        mailbox,
        total: status.exists,
        unseen: unseenList.length,
        messages,
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => client.close());
  }
}

module.exports = { checkInbox };

/* ------------------------------------------------------------------- CLI */
// Lancé en direct : `node imap-check.js` ou `npm run imap`.
if (require.main === module) {
  checkInbox()
    .then((r) => {
      console.log(`\nBoîte : ${r.mailbox}   Total : ${r.total}   Non lus : ${r.unseen}\n`);
      if (!r.messages.length) {
        console.log("(aucun message)");
        return;
      }
      const w = 8, wF = 32, wD = 20;
      console.log(
        "UID".padEnd(w) +
        "DATE".padEnd(wD) +
        "DE".padEnd(wF) +
        "SUJET"
      );
      console.log("-".repeat(w + wD + wF + 40));
      for (const m of r.messages) {
        const dt = new Date(m.date).toLocaleString("fr-FR", {
          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
        });
        const flag = m.seen ? " " : "•";
        console.log(
          (flag + String(m.uid)).padEnd(w) +
          dt.padEnd(wD) +
          (m.from || "").slice(0, wF - 1).padEnd(wF) +
          (m.subject || "").slice(0, 60)
        );
      }
      console.log("\n(• = non lu)\n");
    })
    .catch((e) => {
      console.error("Erreur : " + (e && e.message || e));
      process.exit(1);
    });
}
