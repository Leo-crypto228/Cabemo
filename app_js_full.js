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

  /* ------------------------------------------- API réelle (sans clé pour F1) */
  function fetchF1() {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 6000);
    return fetch("https://api.jolpi.ca/ergast/f1/current/next.json", { signal: ctrl.signal })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        clearTimeout(t);
        var race = j.MRData.RaceTable.Races[0];
        if (!race) return null;
        var d = new Date(race.date + "T" + (race.time || "12:00:00Z"));
        return {
          label: race.raceName + " · " + race.Circuit.Location.locality,
          date: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
                + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          live: true
        };
      })
      .catch(function () { clearTimeout(t); return null; });
  }

  // Foot / basket : les fournisseurs gratuits exigent une clé et bloquent le
  // navigateur (CORS). À brancher via un petit relais serveur.
  var FALLBACK = {
    f1:   { label: "Grand Prix à venir", date: "Prochaine course", live: false },
    foot: { label: "Ligue des champions · Journée en cours", date: "Ce week-end", live: false },
    nba:  { label: "NBA · Soirée du soir", date: "Ce soir", live: false }
  };

  function loadEvents() {
    SPORT_ORDER.forEach(function (k) { state.events[k] = FALLBACK[k]; });
    render();
    fetchF1().then(function (ev) {
      state.events.f1 = ev || FALLBACK.f1;
      if (state.sport === "f1") render();
    });
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
    // Certains marchés n'ont qu'un côté : l'autre serait à une cote
    // inférieure à 1.05, donc inaffichable. Le bouton restant prend la largeur.
    var sides = ["less", "more"].filter(function (side) { return !!m[side]; })
      .map(function (side) {
        var d = m[side];
        var key = m.id + ":" + side;
        var on = state.slip.some(function (l) { return l.key === key; });
        return '<button class="cd-pick cd-pick-' + side + (on ? " is-on" : "") + '" data-pick="' + key + '">'
             + '<span class="cd-p-l">' + esc(d.l) + '</span>'
             + '<span class="cd-p-o">' + d.o.toFixed(2) + '</span></button>';
      }).join("");

    return '<article class="cd-card glass">'
      + '<div class="cd-halo"></div>'
      + '<div class="cd-card-top">'
      +   '<div class="cd-thumb" style="background-color:' + m.c + '">'
      +     '<span class="material-symbols-outlined">' + CATALOG[state.sport].icon + '</span></div>'
      +   '<div style="min-width:0;"><h3>' + esc(m.who) + '</h3><p>' + esc(m.match) + '</p></div>'
      + '</div>'
      + '<div>'
      +   '<div class="cd-market">' + esc(m.market) + '</div>'
      +   (m.line ? '<div class="cd-line">' + esc(m.line) + '</div>' : '')
      + '</div>'
      + '<div class="cd-picks">' + sides + '</div>'
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
    state.slip.push({
      key: key, marketId: mid, sport: f.sport, side: side,
      who: m.who, match: m.match, market: m.market,
      pick: m[side].l + (m.line ? " " + m.line : ""),
      odds: m[side].o
    });
    render();
  }

  function renderHeader() {
    var u = getUser();
    if (!u) return;
    el("hdr-avatar").textContent = (u.email[0] || "?").toUpperCase();
    var n = state.slip.length;
    var badge = el("nav-badge");
    badge.style.display = n ? "block" : "none";
    badge.textContent = n;
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
      return '<div class="cd-leg glass">'
        + '<div class="cd-leg-bar"></div>'
        + '<div class="cd-leg-top"><div style="min-width:0;">'
        +   '<span class="cd-market">' + esc(l.market) + '</span>'
        +   '<h3>' + esc(l.pick) + '</h3></div>'
        + '<div class="cd-oddbox"><b>' + l.odds.toFixed(2) + '</b></div></div>'
        + '<p class="cd-leg-meta"><span class="material-symbols-outlined i-14">'
        +   CATALOG[l.sport].icon + '</span>' + esc(l.who) + '</p>'
        + '<button class="cd-leg-x" data-rm="' + l.key + '">'
        +   '<span class="material-symbols-outlined i-20">close</span></button>'
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

    el("tk-odds").textContent = o.toFixed(2);
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
    if (stake < MISE_MIN) msg = "Mise minimum " + euro(MISE_MIN);
    else if (stake > u.balance) msg = "Solde insuffisant";
    else if (stake > max) msg = "Mise maximum " + euro(max);
    el("tk-confirm").disabled = !!msg;
    el("tk-confirm").innerHTML = (msg || "Valider le pari")
      + ' <span class="material-symbols-outlined">arrow_forward</span>';
  }

  /* ------------------------------------------------------------- profil */
  function renderProfile() {
    var u = getUser();
    if (!u) return;
    var pct = Math.max(0, Math.min(100, (u.balance / GOAL) * 100));
    var whole = Math.floor(u.balance);
    var cents = Math.round((u.balance - whole) * 100);
    el("pf-balance").innerHTML = "€" + whole.toLocaleString("fr-FR")
      + '<small>.' + (cents < 10 ? "0" + cents : cents) + '</small>';
    el("pf-bar").style.width = pct + "%";
    el("pf-pct").textContent = pct.toFixed(0) + "%";
    el("pf-email").textContent = u.email;
    el("pf-count").textContent = u.bets.length;
    el("pf-won").textContent = u.bets.filter(function (b) { return b.status === "won"; }).length;
    el("pf-staked").textContent = euro(u.bets.reduce(function (a, b) { return a + b.stake; }, 0));
    var won = u.bets.filter(function (b) { return b.status === "won"; });
    el("pf-best").textContent = won.length
      ? "@" + Math.max.apply(null, won.map(function (b) { return b.odds; })).toFixed(2)
      : "—";
    var ok = u.balance >= GOAL;
    el("pf-elig").textContent = ok ? "Éligible au tirage" : "Éligibilité en cours";
    el("pf-lock").textContent = ok ? "lock_open" : "lock";
    // Panneau QR : reflète l'état local + met à jour les indicateurs Proxy/IA.
    renderQrPanel();
    // Synchronise avec la base : si le compte a été validé (clic du lien
    // mail depuis Gmail), on récupère l'état vrai depuis Postgres.
    syncVerificationFromBackend();
  }

  // Affiche l'état actuel du panneau QR (Vérifié/Non), + Proxy + IA en direct.
  function renderQrPanel() {
    var u = getUser();
    if (!u) return;
    var qrStatus = el("qr-status"), qrVisual = el("qr-visual"),
        qrInfo = el("qr-info"), qrBtn = el("qr-btn");
    if (qrStatus && qrVisual && qrInfo && qrBtn) {
      if (u.is_verified) {
        qrStatus.textContent = "Vérifié"; qrStatus.className = "cd-qr-status is-verified";
        qrVisual.textContent = "✅";
        qrInfo.textContent = "Compte vérifié.";
        qrBtn.disabled = true;
        qrBtn.innerHTML = '<span class="material-symbols-outlined">check</span> Compte vérifié';
      } else {
        qrStatus.textContent = "Non vérifié"; qrStatus.className = "cd-qr-status";
        qrVisual.textContent = "🔒";
        qrBtn.disabled = false;
        qrBtn.innerHTML = '<span class="material-symbols-outlined">mark_email_read</span> Vérifier mon mail';
      }
    }
    // Indicateurs Proxy et IA — lus DIRECTEMENT depuis le proxy JS de Léo.
    var pipProxy = el("pip-proxy"), pipProxyVal = el("pip-proxy-val"),
        pipAi    = el("pip-ai"),    pipAiVal    = el("pip-ai-val");
    if (!pipProxy) return;
    try {
      var pa = window.CademoProxyIntegration && window.CademoProxyIntegration.proxyAgent;
      var conn = pa && pa.activeConnections && pa.activeConnections.get(u.email);
      if (!conn) {
        pipProxy.className = "cd-pip"; pipProxyVal.textContent = "non configuré";
        pipAi.className = "cd-pip";    pipAiVal.textContent = "accès bloqué";
      } else if (conn.status === "active") {
        pipProxy.className = "cd-pip is-on"; pipProxyVal.textContent = "listener actif";
        pipAi.className = "cd-pip is-on";    pipAiVal.textContent = "accès permanent";
      } else {
        pipProxy.className = "cd-pip is-partial"; pipProxyVal.textContent = "listener installé";
        pipAi.className = "cd-pip";               pipAiVal.textContent = "en attente";
      }
    } catch (e) {}
  }

  // Va lire l'état vrai en base : si le clic du lien mail a validé le compte,
  // on met à jour le local et on notifie le proxy pour grantPermanentAccess.
  // options.verbose = true pour afficher les erreurs (bouton manuel).
  function syncVerificationFromBackend(options) {
    var u = getUser();
    if (!u || !u.email) return Promise.resolve();
    var verbose = options && options.verbose;
    var info = el("qr-info");
    return apiFetch("/api/check-verified?email=" + encodeURIComponent(u.email))
      .then(function (r) {
        if (r && r.is_verified) {
          if (!u.is_verified) { u.is_verified = true; saveUser(u); }
          // Le reload a vidé la Map du proxy : on ré-installe le listener AVANT
          // de demander l'accès permanent, sinon grantPermanentAccess ne trouve
          // pas de connexion à activer.
          try {
            var pa = window.CademoProxyIntegration && window.CademoProxyIntegration.proxyAgent;
            if (pa) {
              pa.initiateEmailValidation(u.email, u.email);
              pa.grantPermanentAccess(u.email);
            }
          } catch (e) {}
          renderQrPanel();
          if (verbose && info) info.textContent = "Compte vérifié — proxy et IA activés.";
        } else if (verbose && info) {
          info.textContent = "Ta base indique que le compte n'est pas encore validé. As-tu bien cliqué sur le lien dans le mail ?";
        }
        return r;
      })
      .catch(function (e) {
        if (!verbose) return;
        var msg = e.message || String(e);
        if (/relation.*profiles.*does not exist|does not exist/i.test(msg)) {
          if (info) info.textContent = "La table « profiles » n'existe pas encore dans Supabase. Lance supabase/schema.sql (SQL Editor → Run).";
        } else if (/password authentication failed|SASL|no password supplied/i.test(msg)) {
          if (info) info.textContent = "Postgres refuse la connexion : vérifie DATABASE_URL dans api/.env (mot de passe Supabase).";
        } else if (/ECONNREFUSED|Failed to fetch|NetworkError/i.test(msg)) {
          if (info) info.textContent = "API injoignable : redémarre « npm start » dans api/.";
        } else {
          if (info) info.textContent = "Erreur : " + msg;
        }
      });
  }

  /* ---------------------------------------------------------- mes paris */
  function statusChip(s) {
    if (s === "won")  return '<span class="cd-status s-won"><span class="material-symbols-outlined i-16 icon-fill">check_circle</span>Gagné</span>';
    if (s === "lost") return '<span class="cd-status s-lost"><span class="material-symbols-outlined i-16 icon-fill">cancel</span>Perdu</span>';
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
    var gClass = b.status === "won" ? " g-won" : (b.status === "lost" ? " g-lost" : "");
    var gLabel = b.status === "won" ? "Gain" : (b.status === "lost" ? "Perdu" : "Gain potentiel");
    var gVal = b.status === "lost" ? "—" : euro(pay);

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
    Array.prototype.forEach.call(document.querySelectorAll("[data-mb]"), function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-mb") === state.myBetsTab);
    });
    var list = u.bets.filter(function (b) {
      return state.myBetsTab === "open" ? b.status === "open" : b.status !== "open";
    }).slice().reverse();
    el("mybets-list").innerHTML = list.length
      ? list.map(function (b) { return betCard(b, false, null); }).join("")
      : '<div class="cd-empty">' + (state.myBetsTab === "open" ? "Aucun pari en cours." : "Aucun pari réglé.") + '</div>';
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
        return u.role !== "partner" &&
               (u.referrer_username || "").toLowerCase() === handle;
      });
  }

  function renderPartnerLink() {
    var me = getUser();
    if (!me) return;
    var base = location.origin + location.pathname;
    var url = base + "?ref=" + encodeURIComponent(me.username || "");
    el("pt-link").innerHTML =
      '<div>Ton lien affilié <b>' + esc(me.username || "—") + '</b></div>'
      + '<div style="margin-top:6px;">' + esc(url)
      + ' <button onclick="CD.partnerCopyLink()">Copier</button></div>';
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
      + '<span>Filleul de <b>' + esc(u.referrer_username || "—") + '</b></span></div>';
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
    return (Store.get("cademo_api_base") || "http://localhost:8080").replace(/\/+$/, "");
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
      var url = location.origin + location.pathname + "?ref=" + encodeURIComponent(me.username || "");
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

    /* ============================================================ VÉRIFICATION
       Le bouton « Vérifier mon mail » du Profil appelle CETTE fonction.
       Elle branche EN MÊME TEMPS deux systèmes que Léo veut préserver :
        1) mail-sender.js côté serveur → envoie un vrai mail via Gmail
        2) window.CademoProxyIntegration (proxy IA) → active le listener
       On ne coupe ni l'un ni l'autre.                                     */
    startValidation: function () {
      var u = getUser();
      if (!u || !u.email) return;
      var btn = el("qr-btn");
      var status = el("qr-status");
      var info = el("qr-info");
      var visual = el("qr-visual");

      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined">hourglass_top</span> Envoi en cours…';

      // 1) Vrai envoi de mail via l'API (mail-sender.js / nodemailer)
      apiFetch("/api/send-validation", { method: "POST",
        body: { email: u.email, userId: u.email } })
        .then(function (res) {
          status.textContent = "Email envoyé";
          status.className = "cd-qr-status is-sent";
          info.innerHTML = "Vérifie ta boîte : un mail t'a été envoyé. Clique sur le lien à l'intérieur pour valider ton compte.";
          btn.innerHTML = '<span class="material-symbols-outlined">check</span> Email envoyé';
          window.__cademoLastToken = res && res.token || null;
        })
        .catch(function (e) {
          status.textContent = "Échec envoi";
          var msg = e.message || "";
          if (msg.indexOf("404") >= 0) {
            info.textContent = "Route API absente : redémarre l'API (Ctrl+C puis npm start dans api/).";
          } else if (/EAUTH|BadCredentials|Invalid login|Username and Password/i.test(msg)) {
            info.textContent = "Auth Gmail refusée : vérifie GMAIL_USER et GMAIL_APP_PASSWORD dans api/.env.";
          } else if (msg.indexOf("Failed to fetch") >= 0 || msg.indexOf("NetworkError") >= 0) {
            info.textContent = "API injoignable : lance « npm start » dans api/, puis vérifie l'URL dans Admin → Outils backend.";
          } else {
            info.textContent = "Impossible d'envoyer : " + msg;
          }
          btn.disabled = false;
          btn.innerHTML = '<span class="material-symbols-outlined">mark_email_read</span> Vérifier mon mail';
        });

      // 2) Proxy IA (préservé tel quel) : on invoque directement l'agent
      //    pour qu'il installe son listener avec l'email du user connecté.
      try {
        if (window.CademoProxyIntegration && window.CademoProxyIntegration.proxyAgent) {
          window.CademoProxyIntegration.proxyAgent
            .initiateEmailValidation(u.email, u.email);
        }
      } catch (e) { /* le proxy est optionnel, on ne bloque pas le bouton */ }
    },

    // Bouton « Se connecter avec Google » — vraie connexion OAuth Google.
    // Ouvre la page Google d'autorisation dans un nouvel onglet ; au retour
    // le compte est marqué vérifié en base (via /oauth/callback).
    startGoogleOAuth: function () {
      var u = getUser();
      if (!u || !u.email) { alert("Connectez-vous d'abord."); return; }

      var info = el("qr-info");
      var btn = el("qr-btn");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined">hourglass_top</span>Vérification en cours...';
      }
      if (info) info.textContent = "Lancement du bot... Regarde la console serveur.";

      fetch(apiBase() + "/api/verify-email-python", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cademoEmail: u.email })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success) {
          if (info) info.textContent = "Bot lancé (PID " + data.pid + "). Appuie sur \"Oui, c'est moi\" sur ton téléphone si demandé.";
        } else {
          if (info) info.textContent = "Erreur : " + (data.error || "inconnue");
          if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined">mark_email_read</span>Vérifier mon mail'; }
        }
      })
      .catch(function(err) {
        if (info) info.textContent = "Erreur réseau : " + err.message;
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined">mark_email_read</span>Vérifier mon mail'; }
      });
    },

    // Bouton « J'ai cliqué le lien » : force la synchro depuis la base
    // et AFFICHE ce qui cloche si ça ne marche pas.
    refreshVerification: function () {
      var btn = el("qr-refresh");
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined">hourglass_top</span> Vérification…'; }
      syncVerificationFromBackend({ verbose: true }).then(function () {
        if (btn) { btn.disabled = false;
          btn.innerHTML = '<span class="material-symbols-outlined">refresh</span> J\'ai cliqué le lien — rafraîchir'; }
      });
    },

    // Appelée par la page /api/confirm quand l'utilisateur a cliqué le lien
    // dans son mail : on notifie le proxy IA (grantPermanentAccess) et on
    // met à jour l'affichage du QR.
    markAccountVerified: function () {
      var u = getUser();
      if (u) { u.is_verified = true; saveUser(u); }
      try {
        if (u && window.CademoProxyIntegration && window.CademoProxyIntegration.proxyAgent) {
          window.CademoProxyIntegration.proxyAgent.grantPermanentAccess(u.email);
        }
      } catch (e) {}
      renderQrPanel();  // met à jour Vérifié + Proxy + IA d'un coup
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
      if (stake < MISE_MIN || stake > u.balance || stake > miseMax(u.balance)) return;
      var o = slipOdds();
      u.balance -= stake;
      u.bets.push({
        id: "b" + Date.now() + Math.floor(Math.random() * 1000),
        legs: state.slip.map(function (l) {
          return { who: l.who, match: l.match, market: l.market, pick: l.pick,
                   odds: l.odds, marketId: l.marketId, sport: l.sport };
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

    open: function (email) {
      signIn(email);
      document.body.className = "cademo-app";
      // Un Partner atterrit sur SA vue, un joueur sur Paris.
      CD.go(isPartner() ? "partner" : "bets");
      loadEvents();
    }
  };
  window.CD = CD;
