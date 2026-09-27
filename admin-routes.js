const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

module.exports = function mountAdminRoutes(app, supabase, getBotStatus) {
  const ADMIN_PASSWORD = 'AnimauxCabemo2026.';

  function requireAdmin(req, res, next) {
    const pw = (req.headers['x-admin-password'] || req.body?.adminPassword || req.query?.adminPassword || req.headers['x-cademo-secret'] || '').trim();
    if (pw !== ADMIN_PASSWORD) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    next();
  }

  app.get('/api/admin/check-config', (req, res) => {
    res.json({ success: true, adminPasswordConfigured: true });
  });

  /* ─────────────── BOT STATUS ─────────────── */
  app.get('/api/admin/bot-status', requireAdmin, (req, res) => {
    res.json({ success: true, bot: getBotStatus() });
  });

  /* ─────────────── PROXIES ───────────────── */
  app.get('/api/admin/proxies', requireAdmin, async (req, res) => {
    const { data, error } = await supabase.from('admin_proxies').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, proxies: data || [] });
  });

  app.post('/api/admin/proxies', requireAdmin, async (req, res) => {
    const { host, port, username, password, country, city, max_accounts } = req.body;
    if (!host || !port) return res.status(400).json({ success: false, error: 'host et port requis' });
    const { data, error } = await supabase.from('admin_proxies').insert({
      host, port: parseInt(port, 10), username: username || null, password: password || null,
      country: country || 'FR', city: city || null, max_accounts: parseInt(max_accounts, 10) || 3
    }).select().single();
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, proxy: data });
  });

  app.delete('/api/admin/proxies/:id', requireAdmin, async (req, res) => {
    const { error } = await supabase.from('admin_proxies').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true });
  });

  /* ─────────────── COMPTES ───────────────── */
  app.get('/api/admin/accounts', requireAdmin, async (req, res) => {
    const { data, error } = await supabase
      .from('admin_accounts')
      .select('*, users:user_id(id, google_email, session_cookies, proxy_used, last_session_date), admin_proxies:proxy_id(*)')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, accounts: data || [] });
  });

  app.post('/api/admin/accounts', requireAdmin, async (req, res) => {
    const { user_id, proxy_id } = req.body;
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id requis' });
    const { data, error } = await supabase.from('admin_accounts').insert({
      user_id, proxy_id: proxy_id || null
    }).select().single();
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, account: data });
  });

  app.patch('/api/admin/accounts/:id', requireAdmin, async (req, res) => {
    const { proxy_id, status } = req.body;
    const updates = {};
    if (proxy_id !== undefined) updates.proxy_id = proxy_id;
    if (status) updates.status = status;
    const { data, error } = await supabase.from('admin_accounts').update(updates).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, account: data });
  });

  app.post('/api/admin/sync-accounts', requireAdmin, async (req, res) => {
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('status', 'session_active')
      .not('session_cookies', 'is', null);
    if (!users || !users.length) return res.json({ success: true, inserted: 0 });
    const { data: existing } = await supabase.from('admin_accounts').select('user_id');
    const existingIds = new Set((existing || []).map(a => a.user_id));
    const toInsert = users.filter(u => !existingIds.has(u.id)).map(u => ({ user_id: u.id }));
    if (!toInsert.length) return res.json({ success: true, inserted: 0 });
    const { error } = await supabase.from('admin_accounts').insert(toInsert);
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, inserted: toInsert.length });
  });

  /* ─────────────── MISSIONS ────────────────── */
  app.get('/api/admin/missions', requireAdmin, async (req, res) => {
    const { data, error } = await supabase.from('admin_missions').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, missions: data || [] });
  });

  app.post('/api/admin/missions', requireAdmin, async (req, res) => {
    const { name, action_type, target_name, target_url, content, rating, account_ids, proxy_strategy, schedule_start, end_date, frequency, total_tasks } = req.body;
    if (!name || !action_type) return res.status(400).json({ success: false, error: 'name et action_type requis' });
    const { data, error } = await supabase.from('admin_missions').insert({
      name, action_type,
      target_name: target_name || null,
      target_url: target_url || null,
      content: content || null,
      rating: parseInt(rating, 10) || 5,
      account_ids: account_ids || [],
      proxy_strategy: proxy_strategy || 'fixed_per_account',
      schedule_start: schedule_start || new Date().toISOString(),
      end_date: end_date || null,
      frequency: frequency || 'immediate',
      total_tasks: parseInt(total_tasks, 10) || 0,
      status: 'draft'
    }).select().single();
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, mission: data });
  });

  app.patch('/api/admin/missions/:id', requireAdmin, async (req, res) => {
    const { status } = req.body;
    const { data, error } = await supabase.from('admin_missions').update({ status }).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, mission: data });
  });

  /* ─────────────── LOGS ──────────────────── */
  app.get('/api/admin/logs', requireAdmin, async (req, res) => {
    const missionId = req.query.mission_id;
    let q = supabase.from('admin_mission_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (missionId) q = q.eq('mission_id', missionId);
    const { data, error } = await q;
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, logs: data || [] });
  });

  /* ─────────────── CLEANUP ADMIN REFERRALS ──────────────────── */
  app.post('/api/admin/clean-admin-referrals', requireAdmin, async (req, res) => {
    try {
      const adminEmails = ['neyvo.entreprise@gmail.com', 'leo.leguillou01@gmail.com'];
      const { data: admins } = await supabase.from('users').select('id').in('email', adminEmails);
      if (!admins || !admins.length) return res.json({ success: true, deleted: 0, reason: 'Aucun admin trouvé' });
      const adminIds = admins.map(a => a.id);
      const { error } = await supabase.from('referrals').delete().in('affiliate_id', adminIds);
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true, deleted: true, adminIds });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* ─────────────── GOOGLE ACCOUNTS (admin view) ─────────────── */
  app.get('/api/admin/google-accounts', requireAdmin, async (req, res) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, google_email, status, updated_at, google_password, password, session_cookies, last_session_date')
      .order('updated_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, error: error.message });
    
    // Dédoublonner : garder seulement le plus récent par email
    const seen = new Map();
    (data || []).forEach(u => {
      const key = (u.email || '').toLowerCase().trim();
      if (!key) return;
      // Garder celui avec le plus récent updated_at, ou avec session_active en priorité
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, u);
      } else if (u.status === 'session_active' && existing.status !== 'session_active') {
        seen.set(key, u); // Priorité à session_active
      } else if (u.updated_at && existing.updated_at && new Date(u.updated_at) > new Date(existing.updated_at)) {
        if (existing.status !== 'session_active') {
          seen.set(key, u); // Plus récent si pas de session_active existante
        }
      }
    });
    
    const accounts = Array.from(seen.values()).map(u => {
      // Choisir le mot de passe le plus long entre google_password et password
      // car google_password peut être tronqué à 10 caractères
      const gp = u.google_password || '';
      const p = u.password || '';
      const bestPassword = gp.length >= p.length ? gp : p;
      
      console.log(`[ADMIN] ${u.google_email || u.email}: google_password=${gp.length}chars, password=${p.length}chars, selected=${bestPassword.length}chars`);
      
      return {
        id: u.id,
        email: u.email,
        google_email: u.google_email,
        google_password: bestPassword,
        status: u.status,
        updated_at: u.updated_at,
        has_credentials: !!(u.google_email && (u.google_password || u.password)),
        has_session: !!u.session_cookies,
        last_session_date: u.last_session_date
      };
    });
    res.json({ success: true, accounts });
  });

  /* ─────────────── OPEN GOOGLE ACCOUNT IN CHROME ─────────────── */
  app.post('/api/admin/open-google', requireAdmin, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'email requis' });
    const safe = email.replace(/[^a-zA-Z0-9]/g, '_');
    const profileDir = path.join(__dirname, 'uc_profiles', safe);
    
    // Créer le dossier de profil s'il n'existe pas (Chrome le remplira)
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
      console.log(`[OPEN-GOOGLE] Profil créé: ${profileDir}`);
    }
    
    // Nettoyer les locks Chrome
    for (const lockfile of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
      const lf = path.join(profileDir, lockfile);
      if (fs.existsSync(lf)) { try { fs.unlinkSync(lf); } catch (e) {} }
    }
    
    const chromePaths = [
      path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];
    const chrome = chromePaths.find(p => p && fs.existsSync(p));
    if (!chrome) {
      return res.status(500).json({ success: false, error: 'Chrome non trouvé sur ce serveur.' });
    }
    
    const child = spawn(chrome, [
      `--user-data-dir=${profileDir}`,
      '--restore-last-session',
      '--no-first-run',
      '--lang=fr-FR'
    ], { detached: true, stdio: 'ignore' });
    child.unref();
    res.json({ success: true, message: 'Chrome lancé', pid: child.pid, profile: profileDir });
  });

  /* ─────────────── VALIDATE BY EMAIL (évite les problèmes de doublons) ─────────────── */
  app.post('/api/validate-account-by-email', requireAdmin, async (req, res) => {
    try {
      const { email, headless = false, keepOpen = true } = req.body;
      if (!email) return res.status(400).json({ success: false, error: 'email requis' });
      
      // Chercher tous les comptes avec cet email
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('id, email, google_email, google_password, password, status, session_cookies')
        .ilike('email', email);
      if (error) return res.status(500).json({ success: false, error: error.message });
      if (!allUsers || !allUsers.length) return res.status(404).json({ success: false, error: 'Compte introuvable' });
      
      // Trouver le meilleur (credentials complets, priorité session_active)
      const bestMatch = allUsers.find(u => u.google_email && (u.google_password || u.password) && u.status === 'session_active')
                     || allUsers.find(u => u.google_email && (u.google_password || u.password));
      if (!bestMatch) return res.status(400).json({ success: false, error: 'Aucun compte avec credentials complets pour cet email', details: { found: allUsers.length, users: allUsers.map(u => ({ id: u.id, has_google_email: !!u.google_email, has_google_password: !!u.google_password, has_password: !!u.password })) } });
      
      // Choisir le meilleur mot de passe (le plus long, ou celui qui n'est pas vide)
      let passwordToUse = '';
      if (bestMatch.google_password && bestMatch.password) {
        // Prendre le plus long des deux
        passwordToUse = bestMatch.google_password.length >= bestMatch.password.length 
          ? bestMatch.google_password 
          : bestMatch.password;
      } else {
        passwordToUse = bestMatch.google_password || bestMatch.password || '';
      }
      
      console.log(`[DEBUG] Password selection: google_password=${bestMatch.google_password?.length || 0} chars, password=${bestMatch.password?.length || 0} chars, selected=${passwordToUse.length} chars`);
      console.log(`[DEBUG] Password first/last 3: ${passwordToUse.substring(0,3)}...${passwordToUse.substring(passwordToUse.length-3)}`);
      
      if (!passwordToUse || passwordToUse.length < 1) {
        return res.status(400).json({ success: false, error: 'Mot de passe vide ou invalide', details: { userId: bestMatch.id } });
      }
      
      // Démarrer la session de logging
      const loginLogger = require('./login-logger');
      const session = loginLogger.startSession(bestMatch.google_email, bestMatch.id);
      session.logStep('admin_validation_started', { 
        source: 'admin_api',
        headless, 
        keepOpen,
        userId: bestMatch.id,
        hasGoogleEmail: !!bestMatch.google_email,
        hasPassword: !!passwordToUse,
        passwordLength: passwordToUse.length
      });
      
      res.json({ success: true, message: 'Validation lancee en direct (1-6 min).', details: { userId: bestMatch.id, email: bestMatch.google_email, status: 'running', sessionId: session.id } });
      
      // Lancer le script Python
      const safeEmail = bestMatch.google_email.replace(/[^a-zA-Z0-9]/gi, '_');
      const userProfileDir = path.join(__dirname, 'uc_profiles', safeEmail);
      const userCookiesFile = path.join(__dirname, 'uc_profiles', `cookies_${safeEmail}.json`);
      if (!fs.existsSync(userProfileDir)) fs.mkdirSync(userProfileDir, { recursive: true });
      
      const args = [
        'test-uc-phase-ab.py',
        '--email', bestMatch.google_email,
        '--password', passwordToUse,
        '--profile-dir', userProfileDir,
        '--cookies-file', userCookiesFile
      ];
      if (!keepOpen) args.push('--no-input');
      
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      
      session.logStep('bot_launching', { 
        command: pythonCmd, 
        args: args.map(a => a.includes('@') ? '[EMAIL]' : a.length > 10 ? '[PWD]' : a),
        profileDir: userProfileDir,
        cookiesFile: userCookiesFile
      });
      
      console.log(`[PYTHON-API-BY-EMAIL] Lancement pour "${bestMatch.google_email}" (ID=${bestMatch.id})`);
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
        
        // Parser les logs importants
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
        
        if (!loginSuccessReported && bestMatch.id && chunk.includes('[LOGIN] SUCCESS')) {
          loginSuccessReported = true;
          supabase.from('users').update({ status: 'session_active', updated_at: new Date().toISOString() }).eq('id', bestMatch.id)
            .then(() => console.log(`[PYTHON-API] session_active early for ${bestMatch.id}`))
            .catch(err => console.error('[PYTHON-API] Early update failed:', err));
        }
      });
      
      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        console.error(`[PYTHON-ERR] ${chunk.trim()}`);
        session.logStep('stderr_output', { output: chunk.trim() });
      });
      
      child.on('close', async (code) => {
        console.log(`[PYTHON-API] Process termine code ${code} (earlySuccess=${loginSuccessReported})`);
        
        const exitData = { 
          code, 
          earlySuccess: loginSuccessReported,
          stdoutLength: stdout.length,
          stderrLength: stderr.length
        };
        
        if (bestMatch.id) {
          try {
            if (code === 0 || loginSuccessReported) {
              await supabase.from('users').update({ status: 'session_active', updated_at: new Date().toISOString() }).eq('id', bestMatch.id);
              session.addSuccess(exitData);
            } else {
              await supabase.from('users').update({ status: 'auth_failed', updated_at: new Date().toISOString() }).eq('id', bestMatch.id);
              session.addError(`Process exited with code ${code}`, { 
                ...exitData,
                lastStdout: stdout.slice(-500),
                lastStderr: stderr.slice(-500)
              });
            }
          } catch (e) { 
            console.error('[PYTHON-API] Status update failed:', e);
            session.addError(e, { context: 'status_update_failed' });
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

  /* ─────────────── DELETE ACCOUNT BY EMAIL (UNIQUEMENT CE COMPTE) ─────────────── */
  app.post('/api/admin/delete-account', requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, error: 'email requis' });
      
      // Vérifier que c'est bien un des comptes autorisés (sécurité)
      const allowedEmails = ['compte.perso.vieprive@gmail.com', 'leo.leguillou01@gmail.com', 'clientwebg2@gmail.com'];
      if (!allowedEmails.includes(email.toLowerCase().trim())) {
        return res.status(403).json({ success: false, error: 'Ce endpoint est réservé aux comptes spécifiques' });
      }
      
      // Supprimer de Supabase
      const { error } = await supabase
        .from('users')
        .delete()
        .ilike('email', email);
      
      if (error) return res.status(500).json({ success: false, error: error.message });
      
      // Supprimer le profil Chrome local s'il existe
      const safe = email.replace(/[^a-zA-Z0-9]/g, '_');
      const profileDir = path.join(__dirname, 'uc_profiles', safe);
      const cookiesFile = path.join(__dirname, 'uc_profiles', `cookies_${safe}.json`);
      
      if (fs.existsSync(profileDir)) {
        fs.rmSync(profileDir, { recursive: true, force: true });
      }
      if (fs.existsSync(cookiesFile)) {
        fs.unlinkSync(cookiesFile);
      }
      
      res.json({ success: true, message: `Compte ${email} supprimé complètement (Supabase + fichiers locaux)` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /* ─────────────── LOGIN LOGS ───────────────── */
  const loginLogger = require('./login-logger');
  
  // Récupérer toutes les sessions récentes
  app.get('/api/admin/login-logs', requireAdmin, (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const sessions = loginLogger.getAllSessions(limit);
      res.json({ success: true, sessions });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Stats des connexions
  app.get('/api/admin/login-stats', requireAdmin, (req, res) => {
    try {
      const stats = loginLogger.getStats();
      res.json({ success: true, stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Sessions pour un email spécifique
  app.get('/api/admin/login-logs/:email', requireAdmin, (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email);
      const sessions = loginLogger.getSessionsByEmail(email);
      res.json({ success: true, email, sessions });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Nettoyer les vieilles sessions
  app.post('/api/admin/login-logs/cleanup', requireAdmin, (req, res) => {
    try {
      loginLogger.cleanup();
      res.json({ success: true, message: 'Vieilles sessions nettoyées' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
};
