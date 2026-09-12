# Cademo — API Node.js + module IMAP

## Installation (une fois)

```powershell
cd C:\Users\Leo\cademo\api
npm install
Copy-Item .env.example .env
```

Ouvre `.env` dans ton éditeur et remplis les valeurs (Postgres, IMAP…).
Le fichier `.env` reste sur ton PC, il n'est pas commité.

---

## API — `POST /api/verify-account`

Met à jour `is_verified` sur un profil.

```powershell
npm start
```

L'API lit tout depuis `.env` — plus besoin d'exporter des variables.
Ça tourne pareil sous PowerShell, cmd et bash.

**Body attendu :**

```json
{ "email": "joueur@example.com", "status": "verified" }
```

**Test rapide (PowerShell) :**

```powershell
# vérifier que l'API répond
curl.exe http://localhost:3000/api/health

# passer un compte à "verified"
curl.exe -X POST http://localhost:3000/api/verify-account `
  -H "Content-Type: application/json" `
  -d '{"email":"neyvo.entreprise@gmail.com","status":"verified"}'
```

Note : sous PowerShell utilise **`curl.exe`** (pas `curl` seul, qui est un
alias vers `Invoke-WebRequest` avec une syntaxe différente).

---

## Module IMAP — `imap-check.js`

Se connecte à une boîte mail (Gmail, Outlook, iCloud…) et liste les
derniers messages. Deux modes d'authentification, choisis par `IMAP_MODE`
dans `.env` :

- **`password`** — utilisateur + mot de passe (ou App Password Gmail)
- **`oauth2`** — Google : rafraîchit un access_token depuis un refresh_token
  via `google-auth-library`

### En ligne de commande

```powershell
npm run imap
```

Sortie type :

```
Boîte : INBOX   Total : 843   Non lus : 4

UID      DATE                DE                              SUJET
------------------------------------------------------------------------
•1284    27/08 18:42         Supabase <no-reply@supabase>    Confirm your account
 1283    27/08 17:10         GitHub <notifications@…>        [cademo] PR merged
…

(• = non lu)
```

### Comme bibliothèque

```js
const { checkInbox } = require("./imap-check");

const { total, unseen, messages } = await checkInbox({ limit: 20 });
console.log(`${unseen} non lus sur ${total}`);
for (const m of messages) {
  console.log(m.date, m.from, "→", m.subject);
}
```

### Configuration Gmail (mode `password`)

Gmail n'accepte plus le vrai mot de passe. Il faut un **App Password** :

1. Compte Google → **Sécurité**
2. Active la vérification en 2 étapes si ce n'est pas fait
3. **Mots de passe des applications** → génère un mot de passe de 16 caractères
4. Colle-le dans `IMAP_PASSWORD` (sans les espaces)

### Configuration Gmail (mode `oauth2`)

1. Google Cloud Console → **APIs & Services → Credentials**
2. Crée un OAuth client (type « Desktop »)
3. Autorise le scope `https://mail.google.com/`
4. Récupère un `refresh_token` via l'OAuth Playground
5. Colle `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
6. Passe `IMAP_MODE=oauth2` dans `.env`

Le module refresh automatiquement l'access_token à chaque connexion.

---

## Sécurité

- Le fichier `.env` **ne doit jamais être commité** (déjà dans `.gitignore`).
- Le champ `API_SECRET` (optionnel) permet de restreindre l'appel à
  `/api/verify-account` — l'appelant doit alors envoyer le header
  `X-Cademo-Secret: <la même valeur>`.
- CORS restreint : par défaut, l'API n'accepte que les origines locales
  (`localhost:5500`, `127.0.0.1:5500`, `192.168.1.110:5500`). Ajoute ton
  domaine final dans `index.js` (variable `ALLOWED_ORIGINS`) quand tu
  publieras l'app.
