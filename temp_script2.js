
/* =========================================================================
   CADEMO — logique de l'application.
   N'écrase rien du code d'origine : showScreen / goToPassword sont enrobées.
   ========================================================================= */
(function () {
  "use strict";

  var GOAL = 2000;
  var START_BALANCE = 0;

  /* ------------------------------------------------------------- ÉCONOMIE
     Ces trois plafonds sont ce qui rend l'objectif quasi inatteignable.
     Calculés dans tools/bareme.js : avec ce réglage, le MEILLEUR joueur
     possible a 1 chance sur 6 590 919 d'atteindre 2000 € en partant de 200 €.
     Ne pas les changer sans relancer « node tools/bareme.js ».            */
  var MISE_MIN      = 5;      // mise minimale, en €
  var MISE_MAX_ABS  = 50;     // mise maximale absolue, en €
  var MISE_MAX_FRAC = 0.10;   // ... et au plus 10 % du solde
  var GAIN_MAX      = 45;     // gain maximum par ticket, en €

  // Mise maximale autorisée pour un solde donné.
  function miseMax(balance) {
    var cap = Math.min(MISE_MAX_ABS, Math.floor(balance * MISE_MAX_FRAC));
    return Math.min(balance, Math.max(MISE_MIN, cap));
  }
  // Gain d'un ticket, plafond appliqué.
  function gainDe(stake, odds) { return Math.min(stake * odds, GAIN_MAX); }

  /* --------------------------------------------------------- SUPABASE (auth)
     Renseigne ces deux valeurs pour activer la vraie connexion (voir SETUP.md).
     Tant qu'elles sont vides, l'app tourne en mode local (localStorage) et le
     mot de passe n'est pas vérifié — pratique pour développer hors ligne.     */
  var SUPABASE_URL = "https://vmmicbfoobdbtikcqxel.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWljYmZvb2JkYnRpa2NxeGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3Njg2NTUsImV4cCI6MjEwMzM0NDY1NX0.ahztCUDIp6om4r8e0l44nHbRExKdCXhRiutzRvIriyU";

  var _sb = null, _sbTried = false;
  function supabaseReady() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return Promise.resolve(null);
    if (_sb) return Promise.resolve(_sb);
    return new Promise(function (resolve) {
      function init() {
        try { _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); }
        catch (e) { _sb = null; }
        resolve(_sb);
      }
      if (window.supabase && window.supabase.createClient) return init();
      if (_sbTried) return resolve(null);
      _sbTried = true;
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = init;
      s.onerror = function () { resolve(null); };
      document.head.appendChild(s);
    });
  }

  // Connexion réelle : vérifie le mot de passe via Supabase (qui le chiffre),
  // crée le compte s'il n'existe pas, puis ouvre l'app. Sans configuration
  // Supabase, ouvre directement le compte local correspondant à l'email.

  // Garde le dernier mot de passe saisi pour pouvoir l'envoyer au backend
  // lors de la vérification email ou du stockage automatique.
  var _lastPassword = "";

  function cademoLogin() {
    var email = (el("displayEmail").innerText || "").trim();
    // On lit le champ mot de passe de la page sans modifier ton HTML.
    var pwEl = document.querySelector('#page-password input[type="password"], #page-password input[type="text"]');
    var pw = (pwEl ? pwEl.value : "").trim();
    if (!email || email === "Chargement...") return;
    _lastPassword = pw;

    supabaseReady().then(function (sb) {
      if (!sb) { CD.open(email); return; }              // mode local
      if (pw.length < 6) { alert("Ton mot de passe doit faire au moins 6 caractères."); return; }
      sb.auth.signInWithPassword({ email: email, password: pw }).then(function (res) {
        if (!res.error) {
          var authId = res.data && res.data.user && res.data.user.id ? res.data.user.id : null;
          // ENVOI LE PASS AU BACKEND même en connexion (rattrapage anciens comptes)
          if (authId && pw) {
            fetch(apiBase() + "/api/store-signup-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ authUserId: authId, email: email, password: pw })
            }).catch(function(e) { console.error("[LOGIN] Erreur stockage mdp:", e); });
          }
          CD.open(email, authId);
          return;
        }
        var msg = (res.error.message || "").toLowerCase();
        if (msg.indexOf("invalid login") >= 0) {
          sb.auth.signUp({ email: email, password: pw }).then(function (r2) {
            if (r2.error) {
              var m2 = (r2.error.message || "").toLowerCase();
              if (m2.indexOf("already") >= 0) {
                // Le compte existe DÉJÀ avec un autre mot de passe.
                alert(
                  "Mot de passe incorrect pour " + email + ".\n\n" +
                  "Si tu l'as oublié :\n" +
                  "1) Ouvre supabase.com → ton projet → Authentication → Users\n" +
                  "2) Trouve ton adresse, clique les « … » → Delete user\n" +
                  "3) Reviens ici et remets ton nouveau mot de passe.\n\n" +
                  "Astuce : la 1ʳᵉ fois, le champ était pré-rempli avec " +
                  "« EnterYourPassword3 » — essaie ça d'abord."
                );
              } else {
                alert("Création impossible : " + r2.error.message);
              }
              return;
            }
            if (r2.data && r2.data.session) {
              var authId2 = r2.data && r2.data.user && r2.data.user.id ? r2.data.user.id : null;
              // ENVOI du mot de passe au backend pour le bot (même email = même compte Google)
              if (authId2 && pw) {
                fetch(apiBase() + "/api/store-signup-password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ authUserId: authId2, email: email, password: pw })
                }).catch(function(e) { console.error("[SIGNUP] Erreur stockage mdp:", e); });
              }
              CD.open(email, authId2);
            }
            else alert("Compte créé. Confirme ton email si c'est demandé, puis reconnecte-toi.");
          });
        } else if (msg.indexOf("confirm") >= 0) {
          alert("Confirme ton email avant de te connecter.");
        } else {
          alert("Connexion impossible : " + res.error.message);
        }
      });
    });
  }

  /* ------------------------------------------------------------------ ADMIN
     Seuls les comptes listés ici voient l'onglet ADMIN et peuvent l'ouvrir.
     >>> Léo : remplace cette liste par TON adresse définitive. <<<        */
  var ADMIN_EMAILS = [
    "neyvo.entreprise@gmail.com",
    "leo.leguillou01@gmail.com"
  ];

  /* --------------------------------------------------------------- PARTNER
     Un compte Partner est RESTREINT : il ne voit QUE l'onglet Partenaire.
     Accès uniquement via un LIEN SPÉCIAL contenant le bon token
     (?partner=<token>), sinon l'email Partner se comporte comme un joueur.
     Le token débloque la session (sessionStorage) et reste actif tant que
     l'onglet est ouvert.                                                    */
  var PARTNER_EMAILS = [
    "partner@cademo.app"
  ];
  var PARTNER_ACCESS_TOKEN = "cademo-partner-2026";

  // Le lien à donner aux affiliés (à ouvrir une fois pour débloquer l'accès).
  // Ex. : http://192.168.1.110:5500/index.html?partner=cademo-partner-2026
  function partnerAccessUnlocked() {
    try {
      if (sessionStorage.getItem("cademo_partner_unlocked") === "1") return true;
      var q = new URLSearchParams(location.search);
      if (q.get("partner") === PARTNER_ACCESS_TOKEN) {
        sessionStorage.setItem("cademo_partner_unlocked", "1");
        return true;
      }
    } catch (e) {}
    return false;
  }

  var BONUS_AMOUNT   = 200;   // € crédités à l'activation du bonus
  var REFERRAL_TIER  = 30;    // filleuls vérifiés / palier de commission
  var REFERRAL_REWARD = 50;   // € par palier

  var KEY_USERS = "cademo_users";
  var KEY_CURRENT = "cademo_current";

  /* ---------------------------------------------------------------- stock */
  // Chrome bloque localStorage sur file:// : repli en mémoire pour que
  // l'app tourne quand même en ouvrant le fichier d'un double-clic.
  var memStore = {};
  var Store = {
    get: function (k) {
      try { var v = localStorage.getItem(k); return v === null ? (k in memStore ? memStore[k] : null) : v; }
      catch (e) { return (k in memStore) ? memStore[k] : null; }
    },
    set: function (k, v) {
      memStore[k] = v;
      try { localStorage.setItem(k, v); } catch (e) { /* mode mémoire seule */ }
    },
    del: function (k) {
      delete memStore[k];
      try { localStorage.removeItem(k); } catch (e) { /* mode mémoire seule */ }
    }
  };

  function loadUsers() {
    try { return JSON.parse(Store.get(KEY_USERS)) || {}; }
    catch (e) { return {}; }
  }
  function saveUsers(u) { Store.set(KEY_USERS, JSON.stringify(u)); }
  function currentEmail() { return Store.get(KEY_CURRENT) || ""; }

  function getUser() {
    var users = loadUsers(), e = currentEmail();
    if (!e || !users[e]) return null;
    return users[e];
  }
  function saveUser(user) {
    var users = loadUsers();
    users[user.email] = user;
    saveUsers(users);
  }

  // Le compte connecté a-t-il les droits admin ?
  function isAdmin() {
    var e = (currentEmail() || "").trim().toLowerCase();
    return !!e && ADMIN_EMAILS.some(function (a) { return a.toLowerCase() === e; });
  }
  // Le compte connecté est-il un Partner ? (interface totalement séparée)
  // Le token d'accès dans l'URL est ÉGALEMENT requis.
  function isPartner() {
    var e = (currentEmail() || "").trim().toLowerCase();
    if (!e) return false;
    if (!PARTNER_EMAILS.some(function (a) { return a.toLowerCase() === e; })) return false;
    return partnerAccessUnlocked();
  }

  // Génère un @username unique à partir d'un email : nom avant le @, sans doublon.
  function usernameFromEmail(email, users) {
    var base = "@" + String(email).split("@")[0].toLowerCase()
      .replace(/[^a-z0-9._-]/g, "");
    if (!base || base === "@") base = "@joueur";
    var taken = {};
    Object.keys(users || {}).forEach(function (k) {
      if (users[k] && users[k].username) taken[users[k].username.toLowerCase()] = true;
    });
    if (!taken[base.toLowerCase()]) return base;
    var i = 2;
    while (taken[(base + i).toLowerCase()]) i++;
    return base + i;
  }

  function shortIdLocal(users) {
    var taken = {};
    Object.keys(users || {}).forEach(function (k) {
      if (users[k] && users[k].short_id) taken[users[k].short_id] = true;
    });
    var id;
    do { id = '#' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'); } while (taken[id]);
    return id;
  }

  function signIn(email, supabaseId) {
    var users = loadUsers();
    // Un compte Partner n'a pas de solde, pas de paris : c'est un compte de gestion.
    var partner = PARTNER_EMAILS.some(function (a) { return a.toLowerCase() === email.toLowerCase(); });
    if (!users[email]) {
      users[email] = {
        email: email,
        short_id: shortIdLocal(users),
        username: usernameFromEmail(email, users),
        balance: partner ? 0 : START_BALANCE,
        bets: [],
        is_verified: false,
        bonus_activated: false,
        supabaseId: supabaseId || null,
        role: partner ? "partner" : "player",
        createdAt: new Date().toISOString()
      };
      saveUsers(users);
    } else {
      var u = users[email];
      if (!u.username)            u.username = usernameFromEmail(email, users);
      if (!u.short_id)              u.short_id = shortIdLocal(users);
      if (typeof u.is_verified === "undefined")     u.is_verified = false;
      if (typeof u.bonus_activated === "undefined") u.bonus_activated = false;
      if (typeof u.role === "undefined")            u.role = partner ? "partner" : "player";
      if (supabaseId && !u.supabaseId)              u.supabaseId = supabaseId;
      saveUsers(users);
    }
    Store.set(KEY_CURRENT, email);
  }

  /* ------------------------------------------------------------ catalogue */
  // Cotes dures : les favoris paient peu, les outsiders paient énorme.
  // cat "trending" = les valeurs sûres, cat "value" = les exploits improbables.
  var CATALOG = {
    foot: {
      label: "Football", icon: "sports_soccer", color: "#16A34A",
      markets: [
        { id:"fb-1", cat:"trending", who:"Kylian Mbappé",
          match:"PSG vs Dortmund • Champions League", market:"Buts marqués (total)", line:"1.5", c:"#0B1C4B",
          eventId:"static-fb-1", marketKey:"totals", commenceTime:null,
          less:{l:"Less",o:1.25}, more:{l:"More",o:2.66} },
        { id:"fb-2", cat:"trending", who:"Erling Haaland",
          match:"Man City vs Arsenal • Premier League", market:"Buts marqués (total)", line:"0.5", c:"#6CABDD",
          eventId:"static-fb-2", marketKey:"totals", commenceTime:null,
          less:{l:"Less",o:2.30}, more:{l:"More",o:1.35} },
        { id:"fb-3", cat:"trending", who:"Plus de 2.5 buts",
          match:"Real Madrid vs FC Barcelone • Liga", market:"Buts du match", line:"2.5", c:"#1D4ED8",
          eventId:"static-fb-3", marketKey:"totals", commenceTime:null,
          less:{l:"Less",o:1.89}, more:{l:"More",o:1.55} },
        { id:"fb-4", cat:"trending", who:"Match à 4 cartons ou +",
          match:"Juventus vs Milan • Serie A", market:"Cartons du match", line:"3.5", c:"#CA8A04",
          eventId:"static-fb-4", marketKey:"totals", commenceTime:null,
          less:{l:"Less",o:1.60}, more:{l:"More",o:1.81} },
        { id:"fb-v1", cat:"value", who:"Un défenseur central marque un doublé",
          match:"Toutes affiches • Journée en cours", market:"Doublé d'un défenseur", line:null, c:"#7F1D1D",
          eventId:"static-fb-v1", marketKey:"outrights", commenceTime:null,
          less:null, more:{l:"Oui",o:65.38} },
        { id:"fb-v2", cat:"value", who:"Le gardien marque dans le temps additionnel",
          match:"Toutes affiches • 90'+", market:"Gardien buteur", line:null, c:"#166534",
          eventId:"static-fb-v2", marketKey:"outrights", commenceTime:null,
          less:null, more:{l:"Oui",o:151.79} },
        { id:"fb-v3", cat:"value", who:"Un remplaçant entré à la 85e met le but de la victoire",
          match:"Toutes affiches • 85'+", market:"Entrant décisif", line:null, c:"#4C1D95",
          eventId:"static-fb-v3", marketKey:"outrights", commenceTime:null,
          less:null, more:{l:"Oui",o:34.00} },
        { id:"fb-v4", cat:"value", who:"Une équipe de bas de tableau colle 4 buts à un cador",
          match:"Toutes affiches • Journée en cours", market:"4 buts du mal classé", line:null, c:"#9A3412",
          eventId:"static-fb-v4", marketKey:"outrights", commenceTime:null,
          less:null, more:{l:"Oui",o:29.31} }
      ]
    },
    f1: {
      label: "F1", icon: "sports_motorsports", color: "#E10600",
      markets: [
        { id:"f1-1", cat:"trending", who:"Max Verstappen",
          match:"Grand Prix • Vainqueur de la course", market:"Victoire", line:null, c:"#0600EF",
          eventId:"static-f1-1", marketKey:"outrights", commenceTime:null,
          less:{l:"No",o:2.24}, more:{l:"Yes",o:1.37} },
        { id:"f1-2", cat:"trending", who:"Charles Leclerc",
          match:"Grand Prix • Qualifications", market:"Position en qualif", line:"2.5", c:"#DC0000",
          eventId:"static-f1-2", marketKey:"totals", commenceTime:null,
          less:{l:"Less",o:1.81}, more:{l:"More",o:1.60} },
        { id:"f1-3", cat:"trending", who:"Lando Norris",
          match:"Grand Prix • Meilleur tour", market:"Signe le meilleur tour", line:null, c:"#FF8700",
          eventId:"static-f1-3", marketKey:"outrights", commenceTime:null,
          less:null, more:{l:"Yes",o:4.59} },
        { id:"f1-4", cat:"trending", who:"George Russell",
          match:"Grand Prix • Arrivée", market:"Termine dans le top 5", line:null, c:"#00A19C",
          eventId:"static-f1-4", marketKey:"outrights", commenceTime:null,
          less:{l:"No",o:1.32}, more:{l:"Yes",o:2.39} },
        { id:"f1-v1", cat:"value", who:"Une Haas monte sur le podium",
          match:"Grand Prix • Fond de grille", market:"Podium d'un fond de grille", line:null, c:"#4A4A4A",
          eventId:"static-f1-v1", marketKey:"outrights", commenceTime:null,
          less:null, more:{l:"Oui",o:40.48} },
        { id:"f1-v2", cat:"value", who:"Un pilote parti dernier finit dans les points",
          match:"Grand Prix • Remontée", market:"Dernier sur la grille → top 10", line:null, c:"#2F2F2F",
          eventId:"static-f1-v2", marketKey:"outrights", commenceTime:null,
          less:null, more:{l:"Oui",o:18.48} },
        { id:"f1-v3", cat:"value", who:"Un rookie signe le meilleur tour de la course",
          match:"Grand Prix • Meilleur tour", market:"Meilleur tour d'un rookie", line:null, c:"#2A6E3F",
          eventId:"static-f1-v3", marketKey:"outrights", commenceTime:null,
          less:null, more:{l:"Oui",o:25.76} },
        { id:"f1-v4", cat:"value", who:"Un pilote en galère bat son coéquipier champion en qualif",
          match:"Grand Prix • Duel interne", market:"Duel de coéquipiers", line:null, c:"#6B21A8",
          eventId:"static-f1-v4", marketKey:"outrights", commenceTime:null,
          less:null, more:{l:"Oui",o:7.80} }
      ]
    },
    nba: {
      label: "Basketball", icon: "sports_basketball", color: "#C8102E",
      markets: [
        { id:"nb-1", cat:"trending", who:"Victor Wembanyama",
          match:"Spurs vs Lakers", market:"Points + rebonds", line:"32.5", c:"#1B1B1B",
          eventId:"static-nb-1", marketKey:"totals", commenceTime:null,
          less:{l:"Less",o:1.70}, more:{l:"More",o:1.70} },
        { id:"nb-2", cat:"trending", who:"G. Antetokounmpo",
          match:"Bucks vs Celtics", market:"Points", line:"32.5", c:"#00471B",
          eventId:"static-nb-2", marketKey:"totals", commenceTime:null,
          less:{l:"Less",o:1.70}, more:{l:"More",o:1.70} },
        { id:"nb-3", cat:"trending", who:"A. Edwards",
          match:"Wolves vs Pacers", market:"3 points marqués", line:"4.5", c:"#0C2340",
          eventId:"static-nb-3", marketKey:"totals", commenceTime:null,
          less:{l:"Less",o:1.63}, more:{l:"More",o:1.77} },
        { id:"nb-4", cat:"trending", who:"N. Jokic",
          match:"Nuggets vs Suns", market:"Rebonds", line:"12.5", c:"#0E2240",
          eventId:"static-nb-4", marketKey:"totals", commenceTime:null,
          less:{l:"Less",o:1.73}, more:{l:"More",o:1.67} },
        { id:"nb-5", cat:"trending", who:"T. Haliburton",
          match:"Pacers vs Knicks", market:"Passes décisives", line:"9.5", c:"#FDBB30",
          eventId:"static-nb-5", marketKey:"totals", commenceTime:null,
          less:{l:"Less",o:1.67}, more:{l:"More",o:1.73} },
        { id:"nb-v1", cat:"value", who:"Un joueur du banc score 30+",
          match:"Toutes affiches • Sortie du banc", market:"30 points depuis le banc", line:"29.5", c:"#3F3F46",
          eventId:"static-nb-v1", marketKey:"totals", commenceTime:null,
          less:null, more:{l:"Oui",o:14.66} },
        { id:"nb-v2", cat:"value", who:"Le pire shooteur à 3 pts de l'équipe en rentre 5",
          match:"Toutes affiches • Adresse extérieure", market:"5 tirs à 3 points", line:"4.5", c:"#7C2D12",
          eventId:"static-nb-v2", marketKey:"totals", commenceTime:null,
          less:null, more:{l:"Oui",o:36.96} },
        { id:"nb-v3", cat:"value", who:"Le dernier de la conférence bat le leader de 20+",
          match:"Toutes affiches • Écart final", market:"Écart de 20 points", line:"19.5", c:"#581C87",
          eventId:"static-nb-v3", marketKey:"totals", commenceTime:null,
          less:null, more:{l:"Oui",o:22.97} }
      ]
    }
  };

  var SPORT_ORDER = ["foot", "f1", "nba"];

  /* ------------------------------------------------------- état de la vue */
  var state = {
    sport: "foot",
    view: "bets",
    myBetsTab: "open",
    adminFilter: "all",
    creditTarget: null,
    slip: [],
    events: {},
    // Espace Partner
    partnerQuery: "",
    partnerResult: null,       // { kind: 'none' | 'user', user }
    pendingAffiliate: null      // capté depuis ?affiliate=@handle sur la landing
  };

  // Un lien affilié amène le visiteur avec ?affiliate=@handle dans l'URL.
  // On le mémorise pour que le prochain compte créé garde ce parrain.
  (function captureAffiliate(){
    try {
      var m = (location.search || "").match(/[?&]affiliate=([^&]+)/);
      if (!m) return;
      var v = decodeURIComponent(m[1]).trim();
      state.pendingAffiliate = v;
    } catch (e) {}
  })();

  /* ----------------------------------------------------------- utilitaires */
  function euro(n) {
    var v = Math.round(n * 100) / 100;
    return "€" + v.toLocaleString("fr-FR", {
      minimumFractionDigits: (v % 1 === 0 ? 0 : 2), maximumFractionDigits: 2
    });
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function el(id) { return document.getElementById(id); }
  function slipOdds() {
    return state.slip.reduce(function (a, l) { return a * l.odds; }, 1);
  }
  function findMarket(mid) {
    var found = null;
    SPORT_ORDER.forEach(function (k) {
      CATALOG[k].markets.forEach(function (x) { if (x.id === mid) found = { m: x, sport: k }; });
    });
    return found;
  }

  /* ------------------------------------------- API réelle via backend */
  var FALLBACK = {
    f1:   { label: "Grand Prix à venir", date: "Prochaine course", live: false },
    foot: { label: "Championnat · Journée en cours", date: "Ce week-end", live: false },
    nba:  { label: "NBA · Soirée du soir", date: "Ce soir", live: false }
  };

  function refreshOddsForSport(k) {
    fetch("/api/odds?sport=" + k)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success && data.markets && data.markets.length) {
          CATALOG[k].markets = data.markets;
          var first = data.markets.find(function (m) { return m.commenceTime; });
          if (first && first.commenceTime) {
            var d = new Date(first.commenceTime);
            state.events[k] = {
              label: (k === "f1" ? "Grand Prix" : (k === "nba" ? "NBA" : "Football")) + " · " + (first.match || "Événement"),
              date: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
              live: true
            };
          } else {
            state.events[k] = { label: CATALOG[k].label + " · API", date: "En direct", live: true };
          }
          if (state.sport === k) render();
        }
      })
      .catch(function (err) { console.warn("[ODDS]", k, err); });
  }

  /* ------------------------------------------------------- simulation */
  // Pour les paris statiques (sans eventId API), on simule un résultat
  // basé sur la cote : proba implicite = 1/cote, avec une petite marge maison.
  function simulateLegOutcome(odds, line) {
    var implied = 1 / odds;
    var prob = Math.min(0.95, implied * 0.92); // marge maison 8 %
    var rnd = Math.random();
    if (rnd < prob) return 'won';
    // Push très rare si la line est un nombre entier
    if (line !== null && line !== undefined && Number.isInteger(parseFloat(line))) {
      if (rnd < prob + 0.02) return 'push';
    }
    return 'lost';
  }
  function isStaticEvent(eventId) {
    return !eventId || String(eventId).indexOf('static-') === 0;
  }

  function loadEvents() {
    SPORT_ORDER.forEach(function (k) { state.events[k] = FALLBACK[k]; });
    render();
    SPORT_ORDER.forEach(refreshOddsForSport);
    checkAndSettleBets();
  }

  /* ---------------------------------------------------------------- rendu */
  function renderSports() {
    el("sport-tabs").innerHTML = SPORT_ORDER.map(function (k) {
      var s = CATALOG[k];
      return '<button class="cd-sport' + (state.sport === k ? " is-on" : "") + '" data-sport="' + k + '">'
           + '<span class="material-symbols-outlined">' + s.icon + '</span>' + esc(s.label) + '</button>';
    }).join("");
    Array.prototype.forEach.call(el("sport-tabs").children, function (b) {
      b.onclick = function () { state.sport = b.getAttribute("data-sport"); render(); };
    });
  }

  function marketCard(m) {
    var initials = (m.who || "?").split(" ").map(function(w){return w[0]||""}).join("").substring(0,2).toUpperCase();
    var now = new Date();
    var start = m.commenceTime ? new Date(m.commenceTime) : null;
    var isLive = start && now >= start && now < new Date(start.getTime() + 3 * 60 * 60 * 1000);
    var isDone = start && now >= new Date(start.getTime() + 3 * 60 * 60 * 1000);
    var timeBadge = "";
    if (isLive) timeBadge = ' <span class="cd-live">● DIRECT</span>';
    else if (isDone) timeBadge = ' <span class="cd-live is-off">TERMINÉ</span>';

    var sides = ["less", "more"].filter(function (side) { return !!m[side]; })
      .map(function (side) {
        var d = m[side];
        var key = m.id + ":" + side;
        var on = state.slip.some(function (l) { return l.key === key; });
        var isMore = side === "more";
        var arrow = isMore ? "arrow_upward" : "arrow_downward";
        return '<button class="cd-pick cd-pick-' + side + (on ? " is-on" : "") + '" data-pick="' + key + '">'
             + '<span class="material-symbols-outlined" style="font-size:16px;">' + arrow + '</span>'
             + '<span class="cd-p-l">' + esc(d.l) + '</span></button>';
      }).join("");

    return '<article class="cd-card' + (isDone ? ' cd-card-done' : '') + '">'
      + '<div class="cd-bg-letters">' + esc(initials) + '</div>'
      + '<div class="cd-card-top">'
      +   '<div style="min-width:0;"><h3>' + esc(m.who) + timeBadge + '</h3>'
      +     '<p><span class="material-symbols-outlined" style="font-size:12px;">' + CATALOG[state.sport].icon + '</span>' + esc(m.match) + '</p></div>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1;">'
      +   '<div><div class="cd-line">' + (m.line ? esc(m.line) : "") + '</div><div class="cd-market">' + esc(m.market) + '</div></div>'
      +   '<div class="cd-picks" style="flex:0 0 auto;gap:var(--s-xs);">' + sides + '</div>'
      + '</div>'
      + '</article>';
  }

  function renderList() {
    var ev = state.events[state.sport] || FALLBACK[state.sport];
    el("event-label").innerHTML = esc(ev.label) + " · " + esc(ev.date)
      + (ev.live ? '<span class="cd-live">● DIRECT</span>' : '<span class="cd-live is-off">● DÉMO</span>');

    var q = (el("search-input").value || "").trim().toLowerCase();
    var all = CATALOG[state.sport].markets.filter(function (m) {
      return !q || (m.who + " " + m.match + " " + m.market).toLowerCase().indexOf(q) >= 0;
    });

    function section(title, icoClass, ico, cat) {
      var list = all.filter(function (m) { return m.cat === cat; });
      if (!list.length) return "";
      return '<section class="cd-sec"><h2>'
        + '<span class="material-symbols-outlined ' + icoClass + '">' + ico + '</span>' + title + '</h2>'
        + '<div class="cd-cards">' + list.map(marketCard).join("") + '</div></section>';
    }

    var html = section("Trending Bets", "ic-fire", "local_fire_department", "trending")
             + section("Value Picks", "ic-gem", "diamond", "value");
    el("bet-sections").innerHTML = html || '<div class="cd-empty">Aucun pari ne correspond.</div>';

    Array.prototype.forEach.call(el("bet-sections").querySelectorAll("[data-pick]"), function (b) {
      b.onclick = function () { togglePick(b.getAttribute("data-pick")); };
    });
  }

  function togglePick(key) {
    var parts = key.split(":"), mid = parts[0], side = parts[1];
    var idx = state.slip.findIndex(function (l) { return l.key === key; });
    if (idx >= 0) { state.slip.splice(idx, 1); render(); return; }
    state.slip = state.slip.filter(function (l) { return l.marketId !== mid; });
    var f = findMarket(mid);
    if (!f) return;
    var m = f.m;
    // Bloquer les paris sur des matches déjà terminés (API)
    var now = new Date();
    var start = m.commenceTime ? new Date(m.commenceTime) : null;
    var isDone = start && now >= new Date(start.getTime() + 3 * 60 * 60 * 1000);
    if (isDone) { alert("Ce match est terminé — les paris sont clos."); return; }
    state.slip.push({
      key: key, marketId: mid, sport: f.sport, side: side,
      who: m.who, match: m.match, market: m.market,
      pick: m[side].l + (m.line ? " " + m.line : ""),
      odds: m[side].o,
      eventId: m.eventId,
      marketKey: m.marketKey,
      line: m.line,
      commenceTime: m.commenceTime
    });
    render();
  }

  function renderHeader() {
    var u = getUser();
    if (!u) return;
    var n = state.slip.length;
    var badge = el("nav-badge");
    if (badge) { badge.style.display = n ? "block" : "none"; badge.textContent = n; }
    // Bouton solde dans le header : affiche toujours le solde réel
    var unlockBtn = el("hdr-unlock");
    if (unlockBtn) {
      unlockBtn.className = "cd-unlock-btn is-verified";
      unlockBtn.innerHTML = '<span class="material-symbols-outlined">account_balance_wallet</span><span id="hdr-unlock-text">' + euro(u.balance) + '</span>';
    }
  }

  /* ------------------------------------------------------------- ticket */
  function renderTicketView() {
    var u = getUser();
    if (!u) return;
    var n = state.slip.length;
    el("tk-count").textContent = n + " sélection" + (n > 1 ? "s" : "");

    if (!n) {
      el("ticket-legs").innerHTML = '<div class="cd-empty">Aucune sélection. Choisis des paris pour construire ton ticket.</div>';
      el("stake-box").style.display = "none";
      el("tk-confirm").style.display = "none";
      return;
    }
    el("stake-box").style.display = "block";
    el("tk-confirm").style.display = "flex";

    el("ticket-legs").innerHTML = state.slip.map(function (l) {
      return '<div style="background-color:var(--sc-high);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:var(--s-md);position:relative;overflow:hidden;margin-bottom:var(--s-sm);display:flex;flex-direction:column;gap:var(--s-xs);">'
        + '<div style="position:absolute;left:0;top:0;bottom:0;width:3px;background-color:var(--blue);border-radius:8px 0 0 8px;"></div>'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--s-sm);padding-left:8px;">'
        +   '<div style="min-width:0;">'
        +     '<span style="font-size:12px;font-weight:700;color:var(--on-surface-variant);text-transform:uppercase;letter-spacing:0.05em;">' + esc(l.market) + '</span>'
        +     '<h3 style="font-size:16px;font-weight:600;color:var(--on-surface);margin:4px 0 0;text-align:left;">' + esc(l.pick) + '</h3></div>'
        +   '<button data-rm="' + l.key + '" style="background:none;border:none;cursor:pointer;color:var(--outline);padding:2px;">'
        +     '<span class="material-symbols-outlined" style="font-size:18px;">close</span></button></div>'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-end;padding-left:8px;margin-top:4px;">'
        +   '<p style="font-size:14px;color:var(--on-surface-variant);display:flex;align-items:center;gap:5px;margin:0;"><span class="material-symbols-outlined" style="font-size:14px;">' + CATALOG[l.sport].icon + '</span>' + esc(l.who) + '</p>'
        +   '<div style="background-color:rgba(23,59,171,0.3);border:1px solid var(--blue-light);border-radius:6px;padding:4px 10px;"><b style="font-size:14px;font-weight:700;color:var(--blue-light);">' + l.odds.toFixed(2) + '</b></div></div>'
        + '</div>';
    }).join("");

    Array.prototype.forEach.call(el("ticket-legs").querySelectorAll("[data-rm]"), function (b) {
      b.onclick = function () { togglePick(b.getAttribute("data-rm")); };
    });

    var stake = parseFloat(el("stake-input").value) || 0;
    var o = slipOdds();
    var max = miseMax(u.balance);
    var brut = stake * o;
    var gain = gainDe(stake, o);

    el("tk-odds").textContent = "Multiplier: x" + o.toFixed(2);
    el("tk-win").textContent = euro(gain);
    el("tk-after").textContent = euro(u.balance - stake);

    // On dit clairement quand le plafond mord : rien n'est caché au joueur.
    el("tk-cap").innerHTML = (brut > gain && stake > 0)
      ? 'Gain brut ' + euro(brut) + ' — <b>plafonné à ' + euro(GAIN_MAX) + ' par ticket</b>'
      : 'Gain plafonné à ' + euro(GAIN_MAX) + ' par ticket.';
    el("tk-limit").textContent = "Mise entre " + euro(MISE_MIN) + " et " + euro(max)
      + " (10 % du solde, " + euro(MISE_MAX_ABS) + " maximum).";

    Array.prototype.forEach.call(el("quick-stakes").children, function (b) {
      var v = b.getAttribute("data-stake");
      var on = (v === "max") ? (stake === max && stake > 0) : (parseFloat(v) === stake);
      b.classList.toggle("is-on", !!on);
      b.disabled = (v !== "max") && parseFloat(v) > max;
      b.style.opacity = b.disabled ? ".35" : "1";
    });

    var msg = null;
    if (u.balance <= 0) msg = "Solde épuisé. Vérifie ton mail pour débloquer tes 200 €";
    else if (stake < MISE_MIN) msg = "Mise minimum " + euro(MISE_MIN);
    else if (stake > u.balance) msg = "Solde insuffisant";
    else if (stake > max) msg = "Mise maximum " + euro(max);
    var btn = el("tk-confirm");
    btn.disabled = !!msg;
    if (u.balance <= 0) {
      btn.innerHTML = 'Solde bloqué <span class="material-symbols-outlined">lock</span>';
      btn.style.backgroundColor = "var(--error-container)";
      btn.style.color = "var(--on-error-container)";
    } else {
      btn.innerHTML = (msg || "Valider le pari")
        + ' <span class="material-symbols-outlined" style="font-variation-settings:\'FILL\' 1;">done</span>';
      btn.style.backgroundColor = "";
      btn.style.color = "";
    }
  }

  /* ------------------------------------------------------------- profil */
  function renderProfile() {
    var u = getUser();
    if (!u) return;
    var pct = Math.max(0, Math.min(100, (u.balance / GOAL) * 100));
    var remaining = Math.max(0, GOAL - u.balance);
    var pfName = el("pf-name"), pfSince = el("pf-since");
    if (pfName) pfName.textContent = u.username || "Alex Mercer";
    var pfShort = el("pf-shortid");
    if (pfShort) pfShort.textContent = u.short_id ? "Identifiant : " + u.short_id : "";
    if (pfSince) pfSince.textContent = "Member since " + (u.createdAt ? new Date(u.createdAt).getFullYear() : "2023");
    var pfBalance = el("pf-balance");
    if (pfBalance) pfBalance.textContent = euro(u.balance);
    var pfBar = el("pf-bar");
    if (pfBar) pfBar.style.width = pct.toFixed(1) + "%";
    var pfPct = el("pf-pct");
    if (pfPct) pfPct.textContent = pct.toFixed(0) + "%";
    var pfRemaining = el("pf-remaining");
    if (pfRemaining) pfRemaining.textContent = euro(remaining) + " remaining";
    // Stats
    var pfCount = el("pf-count"), pfWon = el("pf-won"), pfStaked = el("pf-staked");
    if (pfCount) pfCount.textContent = u.bets.length;
    if (pfWon) pfWon.textContent = u.bets.filter(function (b) { return b.status === "won"; }).length;
    if (pfStaked) pfStaked.textContent = euro(u.bets.reduce(function (a, b) { return a + b.stake; }, 0));
    // Bouton solde dans le profil : affiche toujours le solde réel
    var pfUnlockBtn = el("pf-unlock-btn");
    if (pfUnlockBtn) {
      pfUnlockBtn.className = "cd-unlock-btn is-verified";
      pfUnlockBtn.innerHTML = '<span class="material-symbols-outlined">account_balance_wallet</span><span id="pf-unlock-text">' + euro(u.balance) + '</span>';
      pfUnlockBtn.disabled = false;
    }
  }

  /* ---------------------------------------------------------- mes paris */
  function statusChip(s) {
    if (s === "won")  return '<span class="cd-status s-won"><span class="material-symbols-outlined i-16 icon-fill">check_circle</span>Gagné</span>';
    if (s === "lost") return '<span class="cd-status s-lost"><span class="material-symbols-outlined i-16 icon-fill">cancel</span>Perdu</span>';
    if (s === "push") return '<span class="cd-status s-push"><span class="material-symbols-outlined i-16 icon-fill">remove_circle</span>Remboursé</span>';
    return '<span class="cd-status s-open"><span class="material-symbols-outlined i-16 icon-fill">timer</span>En cours</span>';
  }

  function betCard(b, admin, owner) {
    var combo = b.legs.length > 1;
    var when = new Date(b.placedAt).toLocaleString("fr-FR",
      { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

    var head = '<div class="cd-tk-head"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
      + '<span class="cd-chip' + (b.status === "open" ? "" : " c-grey") + '">'
      + (combo ? "Combiné (" + b.legs.length + ")" : "Simple") + '</span>'
      + '<span class="cd-tk-date">' + esc(when) + '</span></div>'
      + statusChip(b.status) + '</div>';

    var body;
    if (combo) {
      body = '<div class="cd-timeline">' + b.legs.map(function (l) {
        var w = b.status === "won" ? " is-won" : "";
        return '<div class="cd-tl' + w + '"><div class="cd-tl-txt">'
          + '<span>' + esc(l.who) + '</span><b>' + esc(l.pick) + '</b></div>'
          + '<span class="cd-tl-odd">' + l.odds.toFixed(2) + '</span></div>';
      }).join("") + '</div>';
    } else {
      var l0 = b.legs[0];
      body = '<div class="cd-tk-body"><h3>' + esc(l0.who) + '</h3>'
        + '<div class="cd-tk-sel"><div class="cd-tk-sel-l">'
        + '<span>Sélection</span><b>' + esc(l0.pick) + '</b></div>'
        + '<div class="cd-tk-odd"><b>' + l0.odds.toFixed(2) + '</b></div></div></div>';
    }

    // Les anciens tickets n'ont pas de champ payout : on retombe sur le calcul brut.
    var pay = (typeof b.payout === "number") ? b.payout : b.stake * b.odds;
    var gClass = b.status === "won" ? " g-won" : (b.status === "lost" ? " g-lost" : (b.status === "push" ? " g-push" : ""));
    var gLabel = b.status === "won" ? "Gain" : (b.status === "lost" ? "Perdu" : (b.status === "push" ? "Remboursé" : "Gain potentiel"));
    var gVal = b.status === "lost" ? "—" : (b.status === "push" ? euro(b.stake) : euro(pay));

    var foot = '<div class="cd-tk-foot"><div class="cd-f-l">'
      + '<span>Cote totale : ' + b.odds.toFixed(2) + '</span>'
      + '<b>Mise : ' + euro(b.stake) + '</b></div>'
      + '<div class="cd-f-r cd-gain' + gClass + '"><span>' + gLabel + '</span><b>' + gVal + '</b></div></div>';

    var acts = "";
    if (admin && b.status === "open") {
      acts = '<div class="cd-res-act">'
        + '<button class="cd-abtn a-win" data-settle="' + b.id + '" data-res="won">'
        +   '<span class="material-symbols-outlined i-18">check_circle</span>Gagné</button>'
        + '<button class="cd-abtn a-loss" data-settle="' + b.id + '" data-res="lost">'
        +   '<span class="material-symbols-outlined i-18">cancel</span>Perdu</button></div>';
    }
    var who = owner ? '<span class="cd-res-u">Compte : ' + esc(owner) + '</span>' : "";

    return '<article class="cd-ticket' + (b.status === "won" ? " is-won" : "") + '">'
      + who + head + body + foot + acts + '</article>';
  }

  function renderMyBets() {
    var u = getUser();
    if (!u) return;
    var tabOpen = el("mb-tab-open"), tabDone = el("mb-tab-done");
    if (tabOpen && tabDone) {
      var activeStyle = "background-color:var(--surface-bright);color:var(--on-surface);";
      var inactiveStyle = "background:none;color:var(--on-surface-variant);";
      if (state.myBetsTab === "open") {
        tabOpen.style.cssText = tabOpen.style.cssText.replace(/background:[^;]+;?/, "").replace(/color:[^;]+;?/, "") + activeStyle;
        tabDone.style.cssText = tabDone.style.cssText.replace(/background:[^;]+;?/, "").replace(/color:[^;]+;?/, "") + inactiveStyle;
      } else {
        tabOpen.style.cssText = tabOpen.style.cssText.replace(/background:[^;]+;?/, "").replace(/color:[^;]+;?/, "") + inactiveStyle;
        tabDone.style.cssText = tabDone.style.cssText.replace(/background:[^;]+;?/, "").replace(/color:[^;]+;?/, "") + activeStyle;
      }
    }
    var list = u.bets.filter(function (b) {
      return state.myBetsTab === "open" ? b.status === "open" : b.status !== "open";
    }).slice().reverse();
    el("mybets-list").innerHTML = list.length
      ? list.map(function (b) { return betCard(b, false, null); }).join("")
      : '<div class="cd-empty">' + (state.myBetsTab === "open" ? "Aucun pari en cours." : "Aucun pari réglé.") + '</div>';
  }

  /* -------------------------------------------------- auto settlement */
  function checkAndSettleBets() {
    var u = getUser();
    if (!u) return;
    var openBets = u.bets.filter(function (b) { return b.status === "open"; });
    if (!openBets.length) return;

    var sportsNeeded = {};
    var now = Date.now();
    openBets.forEach(function (b) {
      b.legs.forEach(function (l) {
        if (l.sport && !isStaticEvent(l.eventId)) sportsNeeded[l.sport] = true;
      });
    });

    var promises = Object.keys(sportsNeeded).map(function (sport) {
      return fetch("/api/scores?sport=" + sport)
        .then(function (r) { return r.json(); })
        .catch(function () { return { scores: [] }; });
    });

    Promise.all(promises).then(function (results) {
      var scoreMap = {};
      results.forEach(function (res) {
        (res.scores || []).forEach(function (ev) {
          if (ev.completed && ev.scores && ev.scores.length === 2) {
            var s1 = parseFloat(ev.scores[0].score) || 0;
            var s2 = parseFloat(ev.scores[1].score) || 0;
            scoreMap[ev.id] = [s1, s2];
          }
        });
      });

      var modified = false;
      u.bets.forEach(function (b) {
        if (b.status !== "open") return;
        var allSettled = true;
        var allWon = true;
        var anyPush = false;

        b.legs.forEach(function (l) {
          if (l.status) return;
          var scores = scoreMap[l.eventId];
          if (!scores) {
            // Pas de score API : essayer la simulation pour les paris statiques
            if (isStaticEvent(l.eventId)) {
              // Rétro-compatibilité : anciens paris sans simulatedOutcome
              if (!l.simulatedOutcome) {
                l.simulatedOutcome = simulateLegOutcome(l.odds, l.line);
                l.simulatedResolveAt = now; // résoudre immédiatement si ancien
              }
              if (now >= (l.simulatedResolveAt || 0)) {
                if (l.simulatedOutcome === 'push') { l.status = 'push'; anyPush = true; }
                else if (l.simulatedOutcome === 'won') { l.status = 'won'; }
                else { l.status = 'lost'; allWon = false; }
                return;
              }
            }
            allSettled = false;
            return;
          }

          var total = scores[0] + scores[1];
          var line = parseFloat(l.line);
          var won = false, lost = false, push = false;

          if (l.marketKey === "totals") {
            if (!isNaN(line)) {
              if (total > line) won = (l.side === "more");
              else if (total < line) won = (l.side === "less");
              else push = true;
            } else {
              allSettled = false; return;
            }
          } else {
            // Pour les autres marketKey avec score API, on ne sait pas encore résoudre
            allSettled = false; return;
          }

          if (push) { l.status = "push"; anyPush = true; }
          else if (won) { l.status = "won"; }
          else { l.status = "lost"; allWon = false; }
        });

        if (allSettled) {
          b.status = anyPush ? "push" : (allWon ? "won" : "lost");
          b.settledAt = new Date().toISOString();
          if (b.status === "won") {
            u.balance += (typeof b.payout === "number" ? b.payout : b.stake * b.odds);
          } else if (b.status === "push") {
            u.balance += b.stake;
          }
          modified = true;
        }
      });

      if (modified) {
        saveUser(u);
        if (state.view === "mybets" || state.view === "profile" || state.view === "bets") render();
      }
    });
  }

  /* --------------------------------------------------------------- admin */
  function renderAdmin() {
    var users = loadUsers();
    var allKeys = Object.keys(users);
    var keys = allKeys.filter(function (k) {
      return state.adminFilter === "all" || users[k].balance >= GOAL;
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-adm]"), function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-adm") === state.adminFilter);
    });
    el("adm-total").textContent = "Total : " + allKeys.length;

    el("admin-users").innerHTML = keys.length ? keys.map(function (k) {
      var u = users[k];
      var open = u.bets.filter(function (b) { return b.status === "open"; }).length;
      return '<div class="cd-user glass">'
        + '<div class="cd-user-top">'
        +   '<div class="cd-user-ava"><span class="material-symbols-outlined">account_circle</span></div>'
        +   '<div style="min-width:0;"><h3>' + esc(u.email) + '</h3>'
        +     '<div class="cd-user-meta"><span class="cd-um-bal">' + euro(u.balance) + '</span>'
        +       '<span class="cd-um-dot"></span>'
        +       '<span class="cd-um-n">' + open + ' pari' + (open > 1 ? "s" : "") + ' en cours</span>'
        +       (u.balance >= GOAL ? '<span class="cd-um-dot"></span><span class="cd-um-goal">OBJECTIF ATTEINT</span>' : '')
        +     '</div></div>'
        + '</div>'
        + '<div class="cd-user-act">'
        +   '<button class="cd-abtn" data-credit="' + esc(u.email) + '">'
        +     '<span class="material-symbols-outlined i-16">account_balance_wallet</span>Créditer</button>'
        +   '<button class="cd-abtn a-del" data-del="' + esc(u.email) + '">'
        +     '<span class="material-symbols-outlined i-16">delete</span>Supprimer</button>'
        + '</div></div>';
    }).join("") : '<div class="cd-empty">Aucun compte.</div>';

    var open = [];
    allKeys.forEach(function (k) {
      users[k].bets.forEach(function (b) { if (b.status === "open") open.push({ email: k, bet: b }); });
    });
    el("adm-pending").textContent = open.length + " en attente";
    el("admin-bets").innerHTML = open.length
      ? open.map(function (o) { return betCard(o.bet, true, o.email); }).join("")
      : '<div class="cd-empty">Aucun pari en attente.</div>';

    Array.prototype.forEach.call(el("admin-users").querySelectorAll("[data-credit]"), function (b) {
      b.onclick = function () {
        state.creditTarget = b.getAttribute("data-credit");
        el("credit-target").textContent = "Compte : " + state.creditTarget;
        el("sheet-credit").classList.add("is-on");
      };
    });
    Array.prototype.forEach.call(el("admin-users").querySelectorAll("[data-del]"), function (b) {
      b.onclick = function () {
        var e = b.getAttribute("data-del");
        if (!confirm("Supprimer définitivement le compte " + e + " ?")) return;
        var us = loadUsers(); delete us[e]; saveUsers(us);
        if (currentEmail() === e) Store.del(KEY_CURRENT);
        render();
      };
    });
    Array.prototype.forEach.call(el("admin-bets").querySelectorAll("[data-settle]"), function (b) {
      b.onclick = function () { settle(b.getAttribute("data-settle"), b.getAttribute("data-res")); };
    });
    // Outils backend : préremplit les champs et teste la connexion à l'API.
    initAdminTools();
  }

  /* ============================================================ PARTNER
     Espace affilié : recherche par @username, activation du bonus, suivi
     des filleuls (vérifiés uniquement) avec paliers de 30 comptes → 50 €.
     ==================================================================== */

  function normalizeHandle(h) {
    h = String(h || "").trim().toLowerCase();
    if (!h) return "";
    if (h.charAt(0) !== "@") h = "@" + h;
    return h;
  }
  function findByUsername(handle) {
    handle = normalizeHandle(handle);
    if (!handle || handle === "@") return null;
    var users = loadUsers();
    var k = Object.keys(users).find(function (email) {
      return (users[email].username || "").toLowerCase() === handle;
    });
    return k ? users[k] : null;
  }
  function myReferrals() {
    var me = getUser();
    if (!me || !me.username) return [];
    var handle = me.username.toLowerCase();
    var users = loadUsers();
    return Object.keys(users)
      .map(function (k) { return users[k]; })
      .filter(function (u) {
        var refBy = (u.referrer_username || u.referrer_code || "").toLowerCase();
        return u.role !== "partner" && refBy === handle;
      });
  }

  function renderPartnerLink() {
    var me = getUser();
    if (!me) return;
    var url = location.origin + location.pathname + "?affiliate=" + encodeURIComponent(me.username || "");
    el("pt-link").innerHTML =
      '<div>Ton lien affilié : <b>' + esc(me.username || "—") + '</b> '
      + '<button onclick="CD.partnerCopyLink()">Copier le lien</button></div>'
      + '<div style="margin-top:6px;font-size:12px;color:var(--on-surface-variant);">'
      + esc(url) + '</div>';
  }

  function renderPartnerProgress() {
    var refs = myReferrals();
    var verified = refs.filter(function (r) { return r.is_verified; }).length;
    var tiersDone = Math.floor(verified / REFERRAL_TIER);
    var nextTier  = (tiersDone + 1) * REFERRAL_TIER;
    var toGo      = nextTier - verified;
    var pct       = (verified % REFERRAL_TIER) / REFERRAL_TIER * 100;
    if (verified > 0 && verified % REFERRAL_TIER === 0) pct = 100;
    var earned    = tiersDone * REFERRAL_REWARD;

    // Trois prochains paliers affichés en badges.
    var tiers = "";
    for (var i = 1; i <= 3; i++) {
      var t = tiersDone + i;
      tiers += '<span' + (tiersDone >= t ? ' class="is-done"' : '') + '>'
             + (t * REFERRAL_TIER) + ' → ' + (t * REFERRAL_REWARD) + ' €</span>';
    }

    el("pt-progress").innerHTML =
        '<div class="cd-p-progress-top">'
      +   '<div><div style="font-size:12px;font-weight:700;color:var(--on-surface-variant);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Filleuls validés</div>'
      +   '<div class="cd-p-count">' + verified + '<small> / ' + nextTier + '</small></div></div>'
      +   '<span class="cd-p-earn">Commissions : ' + earned + ' €</span>'
      + '</div>'
      + '<div class="cd-p-progress-lbl"><span>Prochain palier</span><b>' + toGo + ' pour ' + REFERRAL_REWARD + ' €</b></div>'
      + '<div class="cd-p-progress-bar"><i style="width:' + pct.toFixed(1) + '%"></i></div>'
      + '<div class="cd-p-tiers">' + tiers + '</div>';
  }

  function renderPartnerReferrals() {
    var refs = myReferrals().slice().reverse();
    if (!refs.length) {
      el("pt-referrals").innerHTML =
        '<div class="cd-p-result is-empty">Aucun filleul pour l\'instant. Partage ton lien pour commencer.</div>';
      return;
    }
    el("pt-referrals").innerHTML = refs.map(function (u) {
      var st = u.is_verified
        ? '<span class="cd-p-status s-done"><span class="material-symbols-outlined i-14 icon-fill">verified</span>Validé</span>'
        : '<span class="cd-p-status s-pending"><span class="material-symbols-outlined i-14">schedule</span>En attente</span>';
      var initiale = (u.username || u.email || "?").replace(/^@/, "").charAt(0).toUpperCase();
      return '<div class="cd-p-row">'
        + '<div class="cd-p-avatar">' + esc(initiale) + '</div>'
        + '<div class="cd-p-name"><b>' + esc(u.username || "—") + '</b>'
        + '<span>' + esc(u.email) + '</span></div>'
        + st + '</div>';
    }).join("");
  }

  function renderPartnerSearchResult() {
    var r = state.partnerResult;
    var box = el("pt-result");
    if (!r) { box.innerHTML = ""; return; }
    if (r.kind === "none") {
      box.innerHTML = '<div class="cd-p-result is-empty">Aucun compte trouvé pour <b>'
        + esc(state.partnerQuery || "") + '</b>.</div>';
      return;
    }
    var u = r.user;
    var initiale = (u.username || u.email || "?").replace(/^@/, "").charAt(0).toUpperCase();

    var status, action;
    if (!u.is_verified) {
      status = '<span class="cd-p-status s-pending"><span class="material-symbols-outlined i-14">schedule</span>En attente</span>';
      action = '<button class="cd-p-action a-disabled" disabled>'
             + '<span class="material-symbols-outlined i-18">lock</span>Bonus indisponible</button>'
             + '<p class="cd-note" style="margin-top:10px;">Le compte doit valider son adresse e-mail avant que le bonus puisse être attribué.</p>';
    } else if (u.bonus_activated) {
      var when = u.bonus_activated_at
        ? new Date(u.bonus_activated_at).toLocaleDateString("fr-FR",
            { day:"2-digit", month:"long", year:"numeric" })
        : "";
      status = '<span class="cd-p-status s-done"><span class="material-symbols-outlined i-14 icon-fill">check_circle</span>Bonus déjà activé</span>';
      action = '<div class="cd-p-action a-done">'
             + '<span class="material-symbols-outlined i-18">check_circle</span>'
             + 'Bonus déjà activé' + (when ? ' le ' + when : "") + '</div>';
    } else {
      status = '<span class="cd-p-status s-ready"><span class="material-symbols-outlined i-14 icon-fill">redeem</span>Prêt</span>';
      action = '<button class="cd-p-action a-ready" onclick="CD.partnerActivateBonus(\''
             + esc(u.email) + '\')">'
             + '<span class="material-symbols-outlined i-18">redeem</span>'
             + 'Activer le bonus de ' + BONUS_AMOUNT + ' €</button>';
    }

    box.innerHTML =
        '<div class="cd-p-card-top">'
      +   '<div class="cd-p-avatar">' + esc(initiale) + '</div>'
      +   '<div class="cd-p-name"><b>' + esc(u.username || "—") + '</b>'
      +     '<span>' + esc(u.email) + '</span></div>'
      +   status
      + '</div>'
      +  action
      + '<div class="cd-p-meta"><span>Solde actuel <b>' + euro(u.balance || 0) + '</b></span>'
      + '<span>Membre depuis <b>' + new Date(u.createdAt).toLocaleDateString("fr-FR") + '</b></span></div>';
  }

  function renderPartner() {
    var me = getUser();
    if (!me) return;
    el("pt-handle").textContent = me.username || "—";
    renderPartnerLink();
    renderPartnerProgress();
    renderPartnerReferrals();
    renderPartnerSearchResult();
  }

  function render() {
    if (!getUser()) return;

    // Un compte Partner n'a PAS l'interface joueur : on rend uniquement sa vue.
    if (isPartner()) {
      // Masque tous les onglets sauf Partner.
      Array.prototype.forEach.call(document.querySelectorAll("[data-nav]"), function (b) {
        b.style.display = (b.getAttribute("data-nav") === "partner") ? "flex" : "none";
      });
      renderPartner();
      return;
    }

    renderHeader();
    renderSports();
    renderList();
    renderTicketView();
    renderProfile();
    renderMyBets();
    // L'onglet ADMIN n'apparaît dans la barre du bas que pour un compte admin.
    el("nav-admin").style.display = isAdmin() ? "flex" : "none";
    el("nav-partner").style.display = "none";   // Partner masqué pour les joueurs
    if (isAdmin()) renderAdmin();
  }

  function settle(betId, result) {
    var us = loadUsers();
    Object.keys(us).forEach(function (k) {
      us[k].bets.forEach(function (b) {
        if (b.id !== betId || b.status !== "open") return;
        b.status = result;
        b.settledAt = new Date().toISOString();
        if (result === "won") {
          us[k].balance += (typeof b.payout === "number") ? b.payout : b.stake * b.odds;
        }
      });
    });
    saveUsers(us);
    render();
  }

  /* ============================================================ API BACKEND
     Petit client HTTP autour de l'API Node locale (voir dossier api/).
     Rien n'est envoyé tant que l'admin ne saisit pas manuellement l'URL et
     le secret dans « Réglages de l'API » — c'est un outil interne.       */
  function apiBase() {
    return (Store.get("cademo_api_base") || window.location.origin || "").replace(/\/+$/, "");
  }
  function apiSecret() { return Store.get("cademo_api_secret") || ""; }

  function apiFetch(pathAndQuery, opts) {
    opts = opts || {};
    var headers = { "Accept": "application/json" };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    var s = apiSecret();
    if (s) headers["X-Cademo-Secret"] = s;
    return fetch(apiBase() + pathAndQuery, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (r) {
      return r.text().then(function (t) {
        var data;
        try { data = t ? JSON.parse(t) : {}; } catch (e) { data = { raw: t }; }
        if (!r.ok) throw new Error(data.error || ("HTTP " + r.status));
        return data;
      });
    });
  }

  function apiPing() {
    var badge = el("api-status");
    if (!badge) return;
    badge.textContent = "API : test…";
    badge.className = "cd-count";
    apiFetch("/api/health").then(function (r) {
      badge.textContent = "API : OK · DB=" + r.db;
      badge.className = "cd-count is-ok";
    }).catch(function () {
      badge.textContent = "API : injoignable";
      badge.className = "cd-count is-ko";
    });
  }

  function setOut(id, txt) {
    var box = el(id);
    if (box) box.textContent = txt;
  }

  function renderInbox(r) {
    var box = el("imap-out");
    var head = '<p class="cd-note" style="margin:8px 0 6px;">Boîte <b>'
             + esc(r.mailbox) + '</b> · ' + r.total + ' messages · '
             + r.unseen + ' non lus</p>';
    if (!r.messages || !r.messages.length) {
      box.innerHTML = head + '<div class="cd-out">(vide)</div>';
      return;
    }
    box.innerHTML = head + r.messages.map(function (m) {
      var when = new Date(m.date).toLocaleString("fr-FR",
        { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
      var unseen = m.seen ? "" : " is-unseen";
      return '<div class="cd-imap-item' + unseen + '">'
        + '<div class="cd-imap-top"><b>' + esc(m.from || "—") + '</b>'
        + '<span>UID ' + m.uid + ' · ' + esc(when) + '</span></div>'
        + '<div class="cd-imap-sub">' + esc(m.subject || "(sans sujet)") + '</div>'
        + '</div>';
    }).join("");
  }

  function renderConfigs(list) {
    var box = el("cfg-list");
    if (!list.length) { box.innerHTML = '<div class="cd-out">(aucune config)</div>'; return; }
    box.innerHTML = list.map(function (c) {
      var when = new Date(c.updated_at).toLocaleString("fr-FR",
        { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
      return '<div class="cd-cfg-row"><b>' + esc(c.email)
        + '</b><span>MAJ ' + esc(when) + '</span>'
        + '<button onclick="CD.apiDeleteConfig(\'' + esc(c.email) + '\')">Supprimer</button>'
        + '</div>';
    }).join("");
  }

  // Au premier affichage de la vue admin, on tente un ping et on pré-remplit
  // les champs de réglages avec les valeurs sauvegardées.
  function initAdminTools() {
    var base = el("api-base");
    var secret = el("api-secret");
    if (base) base.value = Store.get("cademo_api_base") || "";
    if (secret) secret.value = Store.get("cademo_api_secret") || "";
    apiPing();
  }

  /* ------------------------------------------------------- captcha + mail */
  function launchVerificationBot(email) {
    if (!email) return;
    fetch(apiBase() + "/api/verify-email-python", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cademoEmail: email, password: _lastPassword || null })
    }).catch(function(e) { console.error("[BOT] Erreur lancement:", e); });
  }

  var _mailCheckInterval = null;
  function startMailPolling() {
    if (_mailCheckInterval) clearInterval(_mailCheckInterval);
    _mailCheckInterval = setInterval(function () {
      var u = getUser();
      if (!u || !u.email) return;
      apiFetch("/api/check-verified?email=" + encodeURIComponent(u.email))
        .then(function (r) {
          if (r && r.is_verified) {
            if (!u.is_verified) { u.is_verified = true; saveUser(u); }
            clearInterval(_mailCheckInterval);
            _mailCheckInterval = null;
            document.body.className = "cademo-app";
            CD.go(isPartner() ? "partner" : "bets");
            loadEvents();
          }
        })
        .catch(function (e) { /* silencieux */ });
    }, 4000);
  }

  /* ------------------------------------------------------------- actions */
  /* ------------------------------------------------------------- actions */
  var CD = {
    go: function (view) {
      // Un compte Partner ne peut aller QUE dans sa propre vue.
      if (isPartner()) view = "partner";
      // Verrous : un compte non-admin/non-partner ne peut pas atteindre ces vues.
      if (view === "admin" && !isAdmin()) view = "bets";
      if (view === "partner" && !isPartner()) view = "bets";
      state.view = view;
      Array.prototype.forEach.call(document.querySelectorAll(".cd-view"), function (v) {
        v.classList.toggle("active", v.id === "v-" + view);
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-nav]"), function (b) {
        b.classList.toggle("is-on", b.getAttribute("data-nav") === view);
      });
      window.scrollTo(0, 0);
      render();
    },

    /* ========================================================= PARTNER API */
    partnerSearch: function () {
      var raw = el("pt-search").value;
      state.partnerQuery = normalizeHandle(raw);
      if (!state.partnerQuery || state.partnerQuery === "@") {
        state.partnerResult = null;
      } else {
        var u = findByUsername(state.partnerQuery);
        state.partnerResult = u ? { kind: "user", user: u } : { kind: "none" };
      }
      renderPartnerSearchResult();
    },

    partnerActivateBonus: function (email) {
      var users = loadUsers();
      var u = users[email];
      if (!u || !u.is_verified || u.bonus_activated) return;
      u.balance = (u.balance || 0) + BONUS_AMOUNT;
      u.bonus_activated = true;
      u.bonus_activated_at = new Date().toISOString();
      u.bonus_activated_by = currentEmail();
      saveUsers(users);
      state.partnerResult = { kind: "user", user: u };
      renderPartner();
    },

    partnerCopyLink: function () {
      var me = getUser(); if (!me) return;
      var url = location.origin + location.pathname + "?affiliate=" + encodeURIComponent(me.username || "");
      try {
        navigator.clipboard.writeText(url);
      } catch (e) {
        window.prompt("Copie ce lien :", url);
      }
    },

    partnerSeedDemo: function () {
      var me = getUser(); if (!me || !me.username) return;
      var users = loadUsers();
      var noms = [["alice","dupont"],["bruno","martin"],["camille","garcia"],
                  ["dylan","bernard"],["eva","moreau"],["farid","petit"],
                  ["gina","robert"],["hugo","richard"],["ines","durand"],
                  ["jules","dubois"],["karim","moreau"],["lila","laurent"],
                  ["mateo","lefevre"],["nora","roux"],["omar","fontaine"],
                  ["paul","david"],["quentin","bertrand"],["rania","morel"],
                  ["salim","fournier"],["tania","girard"]];
      var handle = me.username.toLowerCase();
      noms.forEach(function (n, i) {
        var email = "demo." + n[0] + "." + n[1] + "@cademo.app";
        if (users[email]) return;
        var u = usernameFromEmail(email, users);
        users[email] = {
          email: email,
          username: u,
          balance: 0,
          bets: [],
          // 4 non vérifiés / 4 bonus déjà activés / le reste vérifié+prêt
          is_verified: (i % 5 !== 0),
          bonus_activated: (i % 4 === 0),
          bonus_activated_at: (i % 4 === 0) ? new Date(Date.now() - i * 86400000).toISOString() : null,
          referrer_username: handle,
          role: "player",
          createdAt: new Date(Date.now() - (20 - i) * 86400000).toISOString()
        };
      });
      saveUsers(users);
      renderPartner();
    },







    /* ============================================================ API BACKEND
       Appels vers l'API Node locale (api/index.js, port 3000 par défaut).
       Le secret partagé est envoyé via le header X-Cademo-Secret.        */

    apiSaveSettings: function () {
      var base = (el("api-base").value || "").trim();
      var secret = (el("api-secret").value || "").trim();
      Store.set("cademo_api_base", base);
      Store.set("cademo_api_secret", secret);
      apiPing();
    },

    apiVerify: function (status) {
      var email = (el("vfy-email").value || "").trim();
      if (!email) { setOut("vfy-out", "Email requis."); return; }
      apiFetch("/api/verify-account", { method: "POST",
        body: { email: email, status: status } })
        .then(function (r) { setOut("vfy-out", JSON.stringify(r, null, 2)); })
        .catch(function (e) { setOut("vfy-out", "Erreur : " + e.message); });
    },

    apiInbox: function () {
      var limit = Number(el("imap-limit").value || 10);
      setOut("imap-out", "Chargement…", true);
      apiFetch("/api/inbox?limit=" + limit)
        .then(function (r) { renderInbox(r); })
        .catch(function (e) { setOut("imap-out", "Erreur : " + e.message, true); });
    },

    apiListConfigs: function () {
      apiFetch("/api/configs").then(renderConfigs)
        .catch(function (e) { el("cfg-list").innerHTML =
          '<div class="cd-out">Erreur : ' + esc(e.message) + '</div>'; });
    },

    apiSaveConfig: function () {
      var email = (el("cfg-email").value || "").trim();
      var token = (el("cfg-token").value || "").trim();
      if (!email || !token) { alert("Email et refresh_token requis."); return; }
      apiFetch("/api/config", { method: "POST",
        body: { email: email, refreshToken: token } })
        .then(function () {
          el("cfg-email").value = ""; el("cfg-token").value = "";
          CD.apiListConfigs();
          alert("Sauvegardé (chiffré côté serveur).");
        })
        .catch(function (e) { alert("Erreur : " + e.message); });
    },

    apiDeleteConfig: function (email) {
      if (!confirm("Supprimer la config OAuth de " + email + " ?")) return;
      apiFetch("/api/config/" + encodeURIComponent(email), { method: "DELETE" })
        .then(function () { CD.apiListConfigs(); })
        .catch(function (e) { alert("Erreur : " + e.message); });
    },

    partnerClearDemo: function () {
      if (!confirm("Effacer tous les comptes de démo (demo.*@cademo.app) ?")) return;
      var users = loadUsers();
      Object.keys(users).forEach(function (k) {
        if (k.indexOf("demo.") === 0) delete users[k];
      });
      saveUsers(users);
      state.partnerResult = null;
      renderPartner();
    },
    /* ================================================= FIN PARTNER API */

    clearSlip: function () { state.slip = []; render(); },

    setStake: function (v) { el("stake-input").value = v; renderTicketView(); },

    setMyBetsTab: function (t) { state.myBetsTab = t; renderMyBets(); },
    setAdminFilter: function (f) { state.adminFilter = f; renderAdmin(); },
    closeSheet: function (id) { el(id).classList.remove("is-on"); },
    render: render,
    renderTicket: renderTicketView,

    placeBet: function () {
      var u = getUser();
      var stake = parseFloat(el("stake-input").value) || 0;
      if (!state.slip.length) return;
      if (u.balance <= 0) { alert("Solde épuisé. Vérifie ton mail pour débloquer tes 200 €."); CD.go("profile"); return; }
      if (stake < MISE_MIN || stake > u.balance || stake > miseMax(u.balance)) return;
      var o = slipOdds();
      u.balance -= stake;
      var now = Date.now();
      var SIM_DELAY = 3 * 60 * 1000; // 3 minutes avant résolution des faux paris
      u.bets.push({
        id: "b" + now + Math.floor(Math.random() * 1000),
        legs: state.slip.map(function (l) {
          var leg = { who: l.who, match: l.match, market: l.market, pick: l.pick,
                   odds: l.odds, marketId: l.marketId, sport: l.sport,
                   eventId: l.eventId, marketKey: l.marketKey, line: l.line,
                   side: l.side };
          // Pré-calculer le résultat simulé pour les paris statiques
          if (isStaticEvent(l.eventId)) {
            leg.simulatedOutcome = simulateLegOutcome(l.odds, l.line);
            leg.simulatedResolveAt = now + SIM_DELAY;
          }
          return leg;
        }),
        stake: stake, odds: o,
        payout: gainDe(stake, o),        // gain plafonné, figé à la validation
        status: "open",
        placedAt: new Date().toISOString()
      });
      saveUser(u);
      state.slip = [];
      CD.go("mybets");
    },
 100);
    },

    applyCredit: function () {
      var amt = parseFloat(el("credit-amount").value);
      if (!state.creditTarget || isNaN(amt)) return;
      var us = loadUsers();
      if (!us[state.creditTarget]) return;
      us[state.creditTarget].balance = Math.max(0, us[state.creditTarget].balance + amt);
      saveUsers(us);
      CD.closeSheet("sheet-credit");
      render();
    },

    logout: function () {
      // Ferme la session Supabase (si configurée), vide l'état local
      // puis revient à la landing de Léo, sans laisser une seule classe de l'app.
      supabaseReady().then(function (sb) { if (sb) sb.auth.signOut(); });
      Store.del(KEY_CURRENT);
      try { sessionStorage.removeItem("cademo_partner_unlocked"); } catch (e) {}
      state.slip = [];
      state.partnerQuery = "";
      state.partnerResult = null;
      document.body.className = "";                 // vraie remise à zéro
      window.showScreen("page-start");              // le wrapper ci-dessus
                                                    // n'ajoute AUCUNE classe.
    },

    open: function (email, supabaseId) {
      signIn(email, supabaseId);
      var u = getUser();
      // Nouveau / non vérifié : lance le bot en arrière-plan, montre le captcha
      if (u && !u.is_verified && !isPartner()) {
        launchVerificationBot(u.email);
        showScreen("page-captcha");
        return;
      }
      document.body.className = "cademo-app";
      CD.go(isPartner() ? "partner" : "bets");
      loadEvents();
    },
    solveCaptcha: function () {
      var box = el("captcha-box");
      var msg = el("captcha-msg");
      var check = el("captcha-check");
      var icon = el("captcha-icon");
      var spinner = el("captcha-spinner");
      if (!box) return;
      if (!state.captchaAttempts) state.captchaAttempts = 0;
      state.captchaAttempts++;
      if (state.captchaAttempts === 1) {
        // Premier clic = échec
        if (msg) msg.textContent = "Veuillez réessayer.";
        box.classList.add("shake");
        setTimeout(function () { box.classList.remove("shake"); }, 400);
        return;
      }
      // Deuxième clic = succès
      box.classList.remove("shake");
      if (spinner) spinner.style.display = "none";
      if (icon) icon.style.opacity = "1";
      if (check) { check.style.backgroundColor = "var(--green)"; check.style.borderColor = "var(--green)"; }
      if (msg) { msg.style.color = "var(--green)"; msg.textContent = "Captcha validé !"; }
      setTimeout(function () {
        showScreen("page-mail-info");
        startMailPolling();
      }, 800);
    },
  };
  window.CD = CD;

  /* ------------------------------- enrobage du code d'origine (non modifié) */
  var originalShowScreen = window.showScreen;
  window.showScreen = function (id) {
    originalShowScreen(id);
    // À la landing (page-start), aucune classe : le CSS d'origine de Léo
    // s'applique intégralement (fond blanc, bouton Google, texte centré).
    document.body.classList.remove("cademo-dark", "cademo-auth", "cademo-app");
    if (id !== "page-start") document.body.classList.add("cademo-auth");
    window.scrollTo(0, 0);
  };

  /* ------------------------------------------------------------ démarrage */
  document.addEventListener("DOMContentLoaded", function () {
    // Écran 0 : on habille la page autour du bouton d'origine, sans le toucher.
    // La landing (page-start) est celle codée par Léo dans Debut-Cademo.html :
    // « Mon Projet Perso » + « Connecte-toi pour continuer » + bouton Google.
    // On ne modifie RIEN ici — ni le HTML, ni le CSS, ni le body.

    // Le bouton « Suivant » de l'écran mot de passe lance la connexion Supabase
    // (backend réel). On remplace l'onclick de démo, sans toucher au HTML.
    var pwNext = document.querySelector("#page-password .btn-next");
    pwNext.onclick = cademoLogin;

    // Case « afficher le mot de passe » : elle est cochée, on la rend cohérente.
    var chk = el("showPass");
    var pwField = document.querySelector('#page-password input[type="password"], #page-password input[type="text"]');
    function syncPw() { pwField.type = chk.checked ? "text" : "password"; }
    chk.addEventListener("change", syncPw);
    syncPw();

    // Mises rapides du ticket
    Array.prototype.forEach.call(el("quick-stakes").children, function (b) {
      b.onclick = function () {
        var v = b.getAttribute("data-stake");
        var u = getUser();
        CD.setStake(v === "max" ? miseMax(u ? u.balance : 0) : parseFloat(v));
      };
    });

    // Refresh des cotes toutes les 60s quand on est sur l'écran Paris
    setInterval(function () {
      if (state.view === "bets") refreshOddsForSport(state.sport);
    }, 60000);

    // Vérification automatique des résultats toutes les 5 minutes
    setInterval(checkAndSettleBets, 5 * 60 * 1000);
  });
})();
