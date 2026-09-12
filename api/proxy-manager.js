// Gestionnaire de proxy pour les comptes utilisateurs
const { connectGmailImap, checkAccountStatus, sendConnectionConfirmation } = require('./gmail-service');
const { createGoogleBusinessService } = require('./google-business-service');

// Stockage des proxies actifs (dans une vraie application, utiliser une base de données)
const activeProxies = new Map();

/**
 * Classe pour gérer les proxies utilisateurs
 */
class ProxyManager {
  constructor() {
    this.proxies = activeProxies;
  }

  /**
   * Crée un nouveau proxy pour un utilisateur
   */
  async createProxy(userId, userEmail, accessToken, refreshToken) {
    try {
      // Création du proxy
      const proxy = {
        userId: userId,
        userEmail: userEmail,
        accessToken: accessToken,
        refreshToken: refreshToken,
        createdAt: new Date(),
        lastActive: new Date(),
        status: 'active',
        connections: []
      };

      // Stockage du proxy
      this.proxies.set(userId, proxy);
      
      // Test de connexion
      const status = await checkAccountStatus(accessToken, userEmail);
      proxy.connectionStatus = status;
      
      // Envoi de confirmation
      await sendConnectionConfirmation(accessToken, userEmail);
      
      console.log(`[PROXY] Proxy créé pour l'utilisateur ${userId}`);
      return proxy;
    } catch (error) {
      console.error('Erreur création proxy:', error);
      throw error;
    }
  }

  /**
   * Récupère un proxy actif
   */
  getProxy(userId) {
    return this.proxies.get(userId);
  }

  /**
   * Met à jour le statut d'un proxy
   */
  updateProxyStatus(userId, status) {
    const proxy = this.proxies.get(userId);
    if (proxy) {
      proxy.status = status;
      proxy.lastActive = new Date();
      return proxy;
    }
    return null;
  }

  /**
   * Supprime un proxy
   */
  removeProxy(userId) {
    return this.proxies.delete(userId);
  }

  /**
   * Liste tous les proxies actifs
   */
  listActiveProxies() {
    return Array.from(this.proxies.values());
  }

  /**
   * Exécute une action via le proxy
   */
  async executeAction(userId, actionType, data) {
    const proxy = this.proxies.get(userId);
    if (!proxy) {
      throw new Error('Proxy non trouvé');
    }

    try {
      switch (actionType) {
        case 'check_status':
          return await checkAccountStatus(proxy.accessToken, proxy.userEmail);
          
        case 'send_email':
          // Implémentation pour envoyer un email
          return { success: true, action: 'email_sent' };
          
        case 'post_review':
          // Création du service Google Business
          const businessService = createGoogleBusinessService(proxy.accessToken, proxy.refreshToken);
          await businessService.initialize();
          
          // Publication de l'avis
          const result = await businessService.postReview(
            data.businessId, 
            data.reviewData
          );
          
          return {
            success: true,
            action: 'review_posted',
            result: result
          };
          
        default:
          throw new Error(`Action non supportée: ${actionType}`);
      }
    } catch (error) {
      console.error(`Erreur action proxy ${actionType}:`, error);
      throw error;
    }
  }
}

// Instance unique du gestionnaire
const proxyManager = new ProxyManager();

module.exports = {
  ProxyManager,
  proxyManager
};