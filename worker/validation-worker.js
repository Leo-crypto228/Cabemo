/**
 * WORKER PRINCIPAL - Ordonnanceur de validations
 * 
 * Ce worker s'occupe de :
 * 1. Récupérer les utilisateurs en attente de validation
 * 2. Lancer l'agent Puppeteer pour chaque compte
 * 3. Gérer les sessions actives (reconnexion périodique)
 * 4. Logger tout
 */

const { getPendingUsers, getUserCredentials, updateUserStatus, getActiveSessions } = require('../api/supabase-client');
const { attemptGoogleAuth } = require('./google-auth-agent');
const { loadSession } = require('./session-manager');
const { checkPoolCapacity } = require('./proxy-rotator');

// État du worker
const workerState = {
  isRunning: false,
  queue: [],
  activeJobs: new Map(),
  stats: {
    totalProcessed: 0,
    success: 0,
    failed: 0,
    pending: 0
  }
};

/**
 * Ajoute un utilisateur à la file d'attente de validation
 */
async function queueUserValidation(userId) {
  console.log(`[WORKER] Ajout file d'attente: ${userId}`);
  
  // Vérifie si déjà en cours
  if (workerState.activeJobs.has(userId)) {
    return { success: false, message: 'Validation déjà en cours pour ce compte' };
  }

  // Récupère les credentials
  const user = await getUserCredentials(userId);
  if (!user) {
    return { success: false, message: 'Utilisateur non trouvé dans Supabase' };
  }

  if (!user.google_email || !user.password) {
    return { success: false, message: 'Email ou mot de passe manquant pour cet utilisateur' };
  }

  const job = {
    userId: userId,
    email: user.google_email,
    password: user.password,
    region: user.proxy_region || 'orleans',
    status: 'queued',
    queuedAt: new Date().toISOString()
  };

  workerState.queue.push(job);
  workerState.stats.pending++;

  console.log(`[WORKER] File: ${workerState.queue.length} jobs en attente`);
  
  // Démarre le worker s'il n'est pas déjà actif
  if (!workerState.isRunning) {
    startWorker();
  }

  return { success: true, message: 'Ajouté à la file d\'attente', position: workerState.queue.length };
}

/**
 * Démarre le worker de traitement
 */
async function startWorker() {
  if (workerState.isRunning) return;
  workerState.isRunning = true;
  
  console.log('[WORKER] 🚀 Démarrage du worker de validation...');
  console.log('[WORKER] Vérification capacité proxy...');
  checkPoolCapacity();

  while (workerState.isRunning) {
    // Traite un job de la file
    if (workerState.queue.length > 0) {
      const job = workerState.queue.shift();
      workerState.stats.pending--;
      workerState.activeJobs.set(job.userId, job);
      
      console.log(`\n[WORKER] ===================================`);
      console.log(`[WORKER] Traitement: ${job.email} (${job.userId})`);
      console.log(`[WORKER] File restante: ${workerState.queue.length} jobs`);
      console.log(`[WORKER] ===================================\n`);

      try {
        await updateUserStatus(job.userId, 'validating');
        
        // LANCE L'AGENT PUPPETEER
        const result = await attemptGoogleAuth(
          job.userId,
          job.email,
          job.password,
          { headless: true } // false = voir le navigateur (debug)
        );

        console.log(`[WORKER] Résultat pour ${job.email}:`, result);
        workerState.stats.totalProcessed++;
        
        if (result.success) {
          workerState.stats.success++;
          console.log(`[WORKER] ✅ SUCCÈS: ${job.email} via ${result.method}`);
        } else {
          workerState.stats.failed++;
          console.log(`[WORKER] ❌ ÉCHEC: ${job.email} - ${result.method}`);
        }

      } catch (error) {
        console.error(`[WORKER] 💥 Erreur inattendue pour ${job.email}:`, error.message);
        workerState.stats.failed++;
        await updateUserStatus(job.userId, 'error_worker');
      } finally {
        workerState.activeJobs.delete(job.userId);
      }

      // Pause entre chaque compte (éviter la détection Google)
      const pauseSeconds = 30 + Math.random() * 60;
      console.log(`[WORKER] Pause ${pauseSeconds.toFixed(0)}s avant prochain compte...`);
      await delay(pauseSeconds * 1000);
    } else {
      // Aucun job en attente, vérifie les sessions actives
      await checkActiveSessions();
      
      // Attend 10 secondes avant de revérifier
      await delay(10000);
    }
  }
}

/**
 * Vérifie les sessions actives (reconnexion si besoin)
 */
async function checkActiveSessions() {
  try {
    const activeUsers = await getActiveSessions();
    
    for (const user of activeUsers) {
      const session = await loadSession(user.id);
      if (!session) {
        console.log(`[WORKER] Session manquante pour ${user.email}, marquage pending...`);
        await updateUserStatus(user.id, 'session_expired');
      }
    }
  } catch (error) {
    console.error('[WORKER] Erreur check sessions:', error.message);
  }
}

/**
 * Arrête le worker
 */
function stopWorker() {
  console.log('[WORKER] Arrêt demandé...');
  workerState.isRunning = false;
}

/**
 * Récupère les stats
 */
function getStats() {
  return {
    ...workerState.stats,
    isRunning: workerState.isRunning,
    queueLength: workerState.queue.length,
    activeJobs: Array.from(workerState.activeJobs.keys())
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  queueUserValidation,
  startWorker,
  stopWorker,
  getStats,
  workerState
};