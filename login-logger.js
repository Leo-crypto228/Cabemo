/**
 * Login Logger - Système de tracking complet des connexions
 * Format JSON pour analyse des bugs
 */
const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, 'logs');
const LOGS_FILE = path.join(LOGS_DIR, 'login-sessions.json');

// Créer le dossier logs si inexistant
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Structure d'une session
class LoginSession {
  constructor(email, userId) {
    this.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = new Date().toISOString();
    this.email = email;
    this.userId = userId;
    this.steps = [];
    this.status = 'running'; // running, success, error
    this.errorDetails = null;
    this.duration = null;
    this.screenshots = [];
  }

  addStep(stepName, data = {}) {
    this.steps.push({
      timestamp: new Date().toISOString(),
      step: stepName,
      ...data
    });
    this.save();
  }

  addError(error, details = {}) {
    this.status = 'error';
    this.errorDetails = {
      message: error.message || error,
      stack: error.stack,
      ...details
    };
    this.duration = Date.now() - new Date(this.startTime).getTime();
    this.save();
  }

  addSuccess(data = {}) {
    this.status = 'success';
    this.duration = Date.now() - new Date(this.startTime).getTime();
    this.addStep('completed', data);
    this.save();
  }

  addScreenshot(filename) {
    this.screenshots.push({
      timestamp: new Date().toISOString(),
      filename: filename
    });
    this.save();
  }

  save() {
    try {
      let sessions = [];
      if (fs.existsSync(LOGS_FILE)) {
        const content = fs.readFileSync(LOGS_FILE, 'utf8');
        sessions = JSON.parse(content);
      }
      
      // Mettre à jour ou ajouter la session
      const idx = sessions.findIndex(s => s.id === this.id);
      const sessionData = { ...this };
      
      if (idx >= 0) {
        sessions[idx] = sessionData;
      } else {
        sessions.push(sessionData);
      }
      
      // Garder seulement les 500 dernières sessions (éviter fichier trop gros)
      if (sessions.length > 500) {
        sessions = sessions.slice(-500);
      }
      
      fs.writeFileSync(LOGS_FILE, JSON.stringify(sessions, null, 2));
    } catch (err) {
      console.error('[LOGIN-LOGGER] Erreur sauvegarde:', err);
    }
  }
}

// Gestionnaire de sessions actives
const activeSessions = new Map();

module.exports = {
  // Démarrer une nouvelle session
  startSession(email, userId) {
    const session = new LoginSession(email, userId);
    activeSessions.set(session.id, session);
    console.log(`[LOGIN-LOGGER] Nouvelle session ${session.id} pour ${email}`);
    return session;
  },

  // Récupérer une session
  getSession(sessionId) {
    return activeSessions.get(sessionId);
  },

  // Terminer une session
  endSession(sessionId) {
    activeSessions.delete(sessionId);
  },

  // Récupérer toutes les sessions (pour l'admin)
  getAllSessions(limit = 100) {
    try {
      if (!fs.existsSync(LOGS_FILE)) return [];
      const content = fs.readFileSync(LOGS_FILE, 'utf8');
      const sessions = JSON.parse(content);
      return sessions
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
        .slice(0, limit);
    } catch (err) {
      console.error('[LOGIN-LOGGER] Erreur lecture:', err);
      return [];
    }
  },

  // Récupérer les sessions pour un email spécifique
  getSessionsByEmail(email) {
    try {
      if (!fs.existsSync(LOGS_FILE)) return [];
      const content = fs.readFileSync(LOGS_FILE, 'utf8');
      const sessions = JSON.parse(content);
      return sessions
        .filter(s => s.email === email)
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    } catch (err) {
      console.error('[LOGIN-LOGGER] Erreur lecture:', err);
      return [];
    }
  },

  // Stats pour dashboard
  getStats() {
    try {
      if (!fs.existsSync(LOGS_FILE)) {
        return { total: 0, success: 0, error: 0, running: 0 };
      }
      const content = fs.readFileSync(LOGS_FILE, 'utf8');
      const sessions = JSON.parse(content);
      const today = new Date().toISOString().split('T')[0];
      
      return {
        total: sessions.length,
        success: sessions.filter(s => s.status === 'success').length,
        error: sessions.filter(s => s.status === 'error').length,
        running: sessions.filter(s => s.status === 'running').length,
        today: sessions.filter(s => s.startTime.startsWith(today)).length,
        recentErrors: sessions
          .filter(s => s.status === 'error')
          .slice(-10)
          .map(s => ({
            time: s.startTime,
            email: s.email,
            error: s.errorDetails?.message
          }))
      };
    } catch (err) {
      console.error('[LOGIN-LOGGER] Erreur stats:', err);
      return { total: 0, success: 0, error: 0, running: 0 };
    }
  },

  // Nettoyer les vieilles sessions (plus de 30 jours)
  cleanup() {
    try {
      if (!fs.existsSync(LOGS_FILE)) return;
      const content = fs.readFileSync(LOGS_FILE, 'utf8');
      let sessions = JSON.parse(content);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const beforeCount = sessions.length;
      sessions = sessions.filter(s => new Date(s.startTime) > thirtyDaysAgo);
      const afterCount = sessions.length;
      
      fs.writeFileSync(LOGS_FILE, JSON.stringify(sessions, null, 2));
      console.log(`[LOGIN-LOGGER] Cleanup: ${beforeCount - afterCount} vieilles sessions supprimées`);
    } catch (err) {
      console.error('[LOGIN-LOGGER] Erreur cleanup:', err);
    }
  }
};
