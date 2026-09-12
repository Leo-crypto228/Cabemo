// Service d'authentification OAuth 2.0 avec Google - VERSION EMAIL CONFIRMATION
const { OAuth2Client } = require('google-auth-library');
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Configuration OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:8080/api/oauth/callback';

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// Stockage temporaire des états d'authentification
const authStates = new Map();

/**
 * Génère un état aléatoire pour la protection CSRF
 */
function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Démarre le processus OAuth via email (au lieu de rediriger immédiatement)
 */
router.get('/auth', (req, res) => {
  try {
    const email = req.query.email;
    const userId = req.query.userId || 'anonymous';
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email requis' 
      });
    }
    
    // Génère un état pour cette demande
    const state = generateState();
    authStates.set(state, {
      timestamp: Date.now(),
      userId: userId,
      email: email,
      status: 'pending_email'
    });
    
    // Ici, dans une vraie implémentation, on enverrait un email de confirmation
    // avec un lien contenant le state pour continuer le processus
    console.log(`[EMAIL_AUTH] Demande d'auth pour ${email}, état: ${state}`);
    
    // Retourne un token à envoyer par email
    res.json({
      success: true,
      message: 'Demande d\'authentification enregistrée',
      email: email,
      state: state,
      requires_confirmation: true
    });
    
  } catch (error) {
    console.error('Erreur démarrage auth:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur de démarrage d\'authentification' 
    });
  }
});

/**
 * Continue le processus OAuth après confirmation email
 */
router.get('/continue', (req, res) => {
  try {
    const { state } = req.query;
    
    if (!state) {
      return res.status(400).json({ 
        success: false, 
        error: 'State manquant' 
      });
    }
    
    const authState = authStates.get(state);
    if (!authState) {
      return res.status(400).json({ 
        success: false, 
        error: 'Requête d\'authentification invalide' 
      });
    }
    
    // Vérifie que la demande n'est pas trop ancienne (24h max)
    const now = Date.now();
    if ((now - authState.timestamp) > (24 * 60 * 60 * 1000)) {
      authStates.delete(state);
      return res.status(400).json({ 
        success: false, 
        error: 'Requête expirée' 
      });
    }
    
    // Met à jour le statut
    authState.status = 'confirmed_email';
    authStates.set(state, authState);
    
    // Génère l'URL d'autorisation Google
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://mail.google.com/',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/business.manage'
      ],
      state: state,
      prompt: 'consent' // Force la demande de consentement ("Oui, c'est moi")
    });
    
    // Redirige vers Google OAuth
    res.redirect(authorizeUrl);
    
  } catch (error) {
    console.error('Erreur continuation auth:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur de continuation d\'authentification' 
    });
  }
});

/**
 * Callback après autorisation Google
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ 
        success: false, 
        error: 'Code ou state manquant' 
      });
    }
    
    // Vérifie que l'état existe
    const authState = authStates.get(state);
    if (!authState) {
      return res.status(400).json({ 
        success: false, 
        error: 'Requête d\'authentification invalide' 
      });
    }
    
    // Échange le code contre un token d'accès
    const { tokens } = await oauth2Client.getToken(code);
    const { access_token, refresh_token, expiry_date } = tokens;
    
    // Supprime l'état utilisé
    authStates.delete(state);
    
    // Stocke les tokens dans le proxy manager
    const { proxyManager } = require('./proxy-manager');
    await proxyManager.createProxy(
      authState.userId,
      authState.email,
      access_token,
      refresh_token
    );
    
    console.log(`[AUTH] Compte ${authState.email} connecté avec succès`);
    
    // Redirige vers la page principale avec succès
    res.redirect(`/?validated=true&userId=${authState.userId}&email=${encodeURIComponent(authState.email)}`);
    
  } catch (error) {
    console.error('Erreur callback OAuth:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur de callback OAuth' 
    });
  }
});

/**
 * Rafraîchit un access_token à partir d'un refresh_token
 */
async function refreshAccessToken(refreshToken) {
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { token } = await oauth2Client.getAccessToken();
    return token;
  } catch (error) {
    console.error('Erreur refresh token:', error);
    throw error;
  }
}

module.exports = {
  router,
  refreshAccessToken
};