// Service d'intégration avec Google Business
const { google } = require('googleapis');

// Configuration des scopes pour Google Business
const BUSINESS_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/business.reviews'
];

/**
 * Service pour gérer les avis Google Business
 */
class GoogleBusinessService {
  constructor(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.auth = null;
    this.business = null;
  }

  /**
   * Initialise l'authentification avec Google
   */
  async initialize() {
    try {
      // Crée l'instance d'authentification
      this.auth = new google.auth.OAuth2();
      this.auth.setCredentials({
        access_token: this.accessToken,
        refresh_token: this.refreshToken
      });

      // Initialise le service Google Business
      this.business = google.businessaccounts({
        version: 'v1',
        auth: this.auth
      });

      console.log('Google Business Service initialized');
      return true;
    } catch (error) {
      console.error('Erreur initialisation Google Business:', error);
      throw error;
    }
  }

  /**
   * Recherche des comptes Google Business
   */
  async listBusinessAccounts() {
    try {
      const response = await this.business.accounts.list();
      return response.data;
    } catch (error) {
      console.error('Erreur liste comptes business:', error);
      throw error;
    }
  }

  /**
   * Recherche une entreprise par nom
   */
  async searchBusiness(name, location = null) {
    try {
      const params = {
        q: name,
        pageSize: 10
      };

      if (location) {
        params.location = location;
      }

      const response = await this.business.accounts.search(params);
      return response.data;
    } catch (error) {
      console.error('Erreur recherche business:', error);
      throw error;
    }
  }

  /**
   * Publie un avis sur une entreprise
   */
  async postReview(businessId, reviewData) {
    try {
      // Formatage des données de l'avis
      const review = {
        rating: reviewData.rating || 5,
        comment: reviewData.comment || '',
        reviewer: {
          name: reviewData.reviewerName || 'Utilisateur Cademo'
        },
        source: 'Cademo Platform'
      };

      const response = await this.business.accounts.reviews.create({
        parent: `accounts/${businessId}`,
        requestBody: review
      });

      return response.data;
    } catch (error) {
      console.error('Erreur publication avis:', error);
      throw error;
    }
  }

  /**
   * Récupère les avis d'une entreprise
   */
  async getReviews(businessId) {
    try {
      const response = await this.business.accounts.reviews.list({
        parent: `accounts/${businessId}`
      });

      return response.data;
    } catch (error) {
      console.error('Erreur récupération avis:', error);
      throw error;
    }
  }

  /**
   * Vérifie si l'utilisateur a les droits sur un compte business
   */
  async checkPermissions(businessId) {
    try {
      const response = await this.business.accounts.get({
        name: `accounts/${businessId}`
      });

      return {
        hasPermission: true,
        business: response.data
      };
    } catch (error) {
      console.error('Erreur vérification permissions:', error);
      return {
        hasPermission: false,
        error: error.message
      };
    }
  }
}

/**
 * Crée un service Google Business avec les tokens fournis
 */
function createGoogleBusinessService(accessToken, refreshToken) {
  return new GoogleBusinessService(accessToken, refreshToken);
}

module.exports = {
  GoogleBusinessService,
  createGoogleBusinessService
};