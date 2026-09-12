# Cademo — mise en ligne (Supabase + Cloudflare)

Ordre à suivre. Chaque étape est indépendante ; l'app fonctionne déjà en local
sans rien de tout ça (mode `localStorage`).

## 1. Connexion réelle (Supabase Auth)

Aujourd'hui, sans configuration, le mot de passe n'est pas vérifié (mode local).
Pour une vraie connexion :

1. Crée un **nouveau projet Supabase** pour Cademo (PAS celui d'Oltronn).
   → https://supabase.com → New project.
2. Dans **Authentication → Providers → Email** : laisse activé.
   Pour tester tout de suite, **désactive « Confirm email »**
   (Authentication → Settings), sinon il faut confirmer chaque compte par mail.
3. Dans **Project Settings → API**, copie :
   - `Project URL`
   - `anon public` key
4. Colle-les dans `index.html`, tout en haut du script de l'app :
   ```js
   var SUPABASE_URL = "https://xxxx.supabase.co";
   var SUPABASE_ANON_KEY = "eyJhbGciOi...";
   ```
5. C'est tout. Le bouton « Suivant » de la page mot de passe crée le compte
   au premier passage, puis vérifie le mot de passe ensuite. Supabase chiffre
   le mot de passe : il n'est jamais stocké en clair, et jamais visible par toi.

> À ce stade, la connexion est réelle mais le **solde et les paris restent
> locaux à l'appareil**. Le partage entre appareils, c'est l'étape 3.

## 2. Données foot et basket en direct (Cloudflare Worker)

Les clés API ne doivent jamais être dans la page. Le Worker les garde côté serveur.

1. https://dash.cloudflare.com → Workers & Pages → Create → Worker.
2. Colle le contenu de `worker/cademo-proxy.js`.
3. **Settings → Variables and Secrets** → ajoute deux secrets :
   - `FOOTBALL_DATA_KEY`  → ta clé football-data.org
   - `BALLDONTLIE_KEY`    → ta clé balldontlie
4. Déploie. Tu obtiens une URL `https://cademo-proxy.<compte>.workers.dev`.
5. Dans `ALLOWED_ORIGINS` (en haut du Worker), mets l'adresse de ton site.

Ce qu'il expose :
- `/foot/matches?comp=FL1` — prochains matchs (FL1 = Ligue 1, PL, PD, SA, BL1, CL…)
- `/foot/scorers?comp=PL` — classement des buteurs
- `/nba/games` — derniers matchs NBA avec scores

> ⚠️ balldontlie gratuit ne donne PAS les stats par joueur (points, rebonds) :
> réservé au tier payant. Les paris « points d'un joueur » se règlent donc à la
> main depuis l'admin, ou en passant au tier payant plus tard.

## 3. Comptes partagés + admin (Supabase, table)

Pour que l'admin voie tous les comptes et que le solde suive d'un appareil à
l'autre, il faut les tables. Le schéma est prêt : `supabase/schema.sql`.

1. Supabase → **SQL Editor** → New query → colle `supabase/schema.sql` → Run.
2. Crée ton compte admin depuis l'app (email + mot de passe).
3. Repasse dans le SQL Editor et lance une fois :
   ```sql
   update public.profiles set is_admin = true
   where email = 'neyvo.entreprise@gmail.com';
   ```

Le schéma pose les garde-fous côté serveur : le solde ne peut changer que par
`place_bet` (débit + plafonds), `settle_bet` (admin) et `credit_account` (admin) —
un joueur ne peut pas se tricher un solde. Le branchement de l'app sur ces
fonctions se fera ensemble une fois l'auth (étape 1) confirmée.

> Note : `SUPABASE_URL` est déjà rempli dans `index.html`
> (`https://vmmicbfoobdbtikcqxel.supabase.co`). Il ne manque que la clé anon.

## 4. Hébergement (Cloudflare Pages + domaine)

1. Cloudflare → Workers & Pages → Create → Pages → connecte un dépôt ou
   glisse le dossier. Le fichier servi est `index.html`.
2. Ajoute ton nom de domaine dans **Custom domains**.
3. Reporte ce domaine dans `ALLOWED_ORIGINS` du Worker (étape 2.5).

---

### Rappel sécurité
- Les clés API vivent dans les **secrets Cloudflare**, jamais dans `index.html`.
- La liste des admins (`ADMIN_EMAILS` dans `index.html`) est encore côté client :
  suffisante pour développer, à déplacer côté serveur (étape 3) avant d'ouvrir
  l'app à d'autres personnes.
- Recalcule l'économie avec `node tools/bareme.js` si tu touches aux cotes.
