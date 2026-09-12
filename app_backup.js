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
