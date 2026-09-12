/**
 * BOT ENGINE — Orchestrateur de missions IA / Google Business
 * Isolé du serveur Express. Ne démarre que si les dépendances sont présentes.
 */
const { supabase } = require('./api/supabase-client');

let postGoogleReview = null;
try {
  ({ postGoogleReview } = require('./worker/google-business-agent'));
} catch (e) {
  console.warn('[BOT] google-business-agent indisponible :', e.message);
}

let botInterval = null;
let isRunning = false;
const HOUR = 60 * 60 * 1000;

/* ================================================================ */
/* Helpers                                                         */
/* ================================================================ */
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function minutesSince(dateISO) {
  if (!dateISO) return Infinity;
  return (Date.now() - new Date(dateISO).getTime()) / 60000;
}

async function getAvailableAccounts() {
  const { data, error } = await supabase
    .from('admin_accounts')
    .select('id, user_id, proxy_id, status, users:user_id (google_email, session_cookies, proxy_used)')
    .eq('status', 'valid');
  if (error) { console.error('[BOT] Erreur accounts:', error.message); return []; }
  return (data || []).filter(a => a.users && a.users.session_cookies);
}

async function pickReadyAccounts(mission, allAccounts) {
  const accountIds = (mission.account_ids && mission.account_ids.length)
    ? mission.account_ids
    : allAccounts.map(a => a.id);
  const ready = [];
  for (const acc of allAccounts) {
    if (!accountIds.includes(acc.id)) continue;
    const { data: logs } = await supabase
      .from('admin_mission_logs')
      .select('created_at')
      .eq('mission_id', mission.id)
      .eq('account_id', acc.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const last = logs && logs[0] ? logs[0].created_at : null;
    const mins = minutesSince(last);
    let ok = true;
    if (mission.frequency === '1_per_hour' && mins < 60) ok = false;
    if (mission.frequency === '3_per_day' && mins < 480) ok = false;
    if (mission.frequency === 'random_spread') {
      const minDelay = 120 + Math.floor(Math.random() * 600);
      if (mins < minDelay) ok = false;
    }
    if (ok) ready.push(acc);
  }
  return ready;
}

/* ================================================================ */
/* Exécution d'une tâche unitaire                                   */
/* ================================================================ */
async function runTask(mission, account) {
  if (!postGoogleReview) {
    return { success: false, error: 'Agent Google Business non chargé (Puppeteer manquant ?)' };
  }
  const searchQuery = mission.target_name || mission.target_url || mission.name;
  const category = 'service';
  const rating = mission.rating || 5;
  try {
    const result = await postGoogleReview(account.user_id, searchQuery, category, rating, { headless: true });
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}
/* ================================================================ */
/* Log & Mise à jour mission                                       */
/* ================================================================ */
async function logAction(missionId, accountId, action, result) {
  await supabase.from('admin_mission_logs').insert({
    mission_id: missionId,
    account_id: accountId,
    action: action,
    status: result.success ? 'success' : 'failed',
    error_message: result.error || null
  });
}

async function bumpMission(mission, succeeded) {
  const newCompleted = mission.completed_tasks + (succeeded ? 1 : 0);
  let newStatus = mission.status;
  const now = new Date();
  const endDate = mission.end_date ? new Date(mission.end_date) : null;
  if (newCompleted >= mission.total_tasks) newStatus = 'completed';
  else if (endDate && now > endDate) newStatus = 'completed';
  await supabase
    .from('admin_missions')
    .update({ completed_tasks: newCompleted, status: newStatus, updated_at: now.toISOString() })
    .eq('id', mission.id);
}

async function touchAccount(accountId) {
  await supabase
    .from('admin_accounts')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', accountId);
}

/* ================================================================ */
/* Tick principal                                                   */
/* ================================================================ */
async function tick() {
  if (isRunning) return;
  isRunning = true;
  try {
    const nowISO = new Date().toISOString();
    const { data: missions, error: mErr } = await supabase
      .from('admin_missions')
      .select('*')
      .in('status', ['scheduled', 'running'])
      .lte('schedule_start', nowISO)
      .or(`end_date.is.null,end_date.gte.${nowISO}`);
    if (mErr) { console.error('[BOT] Fetch missions:', mErr.message); return; }
    if (!missions || !missions.length) return;

    const allAccounts = await getAvailableAccounts();
    for (const mission of missions) {
      if (mission.status === 'scheduled') {
        await supabase.from('admin_missions').update({ status: 'running', updated_at: nowISO }).eq('id', mission.id);
        mission.status = 'running';
        console.log('[BOT] Mission "' + mission.name + '" démarrée');
      }
      if (mission.completed_tasks >= mission.total_tasks) continue;

      const ready = await pickReadyAccounts(mission, allAccounts);
      if (!ready.length) {
        console.log('[BOT] Mission "' + mission.name + '" — aucun compte prêt');
        continue;
      }
      for (const acc of ready) {
        if (mission.completed_tasks >= mission.total_tasks) break;
        console.log('[BOT] Exécution "' + mission.name + '" — compte ' + acc.users.google_email);
        const result = await runTask(mission, acc);
        await logAction(mission.id, acc.id, mission.action_type, result);
        await bumpMission(mission, result.success);
        await touchAccount(acc.id);
        if (result.success) { mission.completed_tasks++; console.log('[BOT] ✔️ succès'); }
        else { console.log('[BOT] ❌ échec : ' + result.error); }
        await delay(5000 + Math.random() * 10000);
      }
    }
  } catch (err) {
    console.error('[BOT] Tick error :', err.message);
  } finally {
    isRunning = false;
  }
}

/* ================================================================ */
/* API publique du module                                           */
/* ================================================================ */
function startBotEngine() {
  if (botInterval) return;
  console.log('[BOT] Engine démarré — tick toutes les 60s');
  tick();
  botInterval = setInterval(tick, 60 * 1000);
}

function stopBotEngine() {
  if (botInterval) { clearInterval(botInterval); botInterval = null; console.log('[BOT] Engine arrêté'); }
}

function getBotStatus() {
  return { running: !!botInterval, agentLoaded: !!postGoogleReview };
}

module.exports = { startBotEngine, stopBotEngine, getBotStatus };

