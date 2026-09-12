// Service d'accès aux emails Gmail avec IMAP - VERSION CORRIGÉE
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const imap = require('imap');
const simpleParser = require('mailparser').simpleParser;

// Configuration OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:8080/api/oauth/callback';

const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);

/**
 * Crée un transporteur Nodemailer pour envoyer des emails (version simulée)
 */
function createTransporter(accessToken) {
  // Simule le transporteur pour éviter les erreurs
  return {
    verify: async () => {
      console.log('[MAIL_SIM] Transporteur vérifié (simulé)');
      return { success: true };
    },
    sendMail: async (mailOptions) => {
      console.log('[MAIL_SIM] Email simulé envoyé:', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text?.substring(0, 100) + '...'
      });
      return { success: true, messageId: 'simulated-' + Date.now() };
    }
  };
}

/**
 * Connecte à Gmail via IMAP
 */
async function connectGmailImap(accessToken, userEmail) {
  try {
    // Configuration IMAP pour Gmail
    const config = {
      user: userEmail,
      pass: accessToken, // Dans un vrai cas, on utiliserait un app password ou OAuth
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      authMethod: 'XOAUTH2'
    };

    return new Promise((resolve, reject) => {
      const client = new imap(config);
      
      client.on('ready', () => {
        resolve(client);
      });
      
      client.on('error', (err) => {
        reject(err);
      });
      
      client.connect();
    });
  } catch (error) {
    console.error('Erreur connexion IMAP:', error);
    throw error;
  }
}

/**
 * Lis les emails d'un compte
 */
async function listEmails(imapClient, folder = 'INBOX', limit = 10) {
  return new Promise((resolve, reject) => {
    imapClient.openBox(folder, true, (err, box) => {
      if (err) {
        reject(err);
        return;
      }

      const f = imapClient.fetch(`${box.messages.total - limit + 1}:${box.messages.total}`, {
        bodies: '',
        struct: true
      });

      const emails = [];
      
      f.on('message', (msg, seqno) => {
        msg.on('body', (stream) => {
          simpleParser(stream, (err, parsed) => {
            if (err) {
              console.error('Erreur parsing email:', err);
              return;
            }
            
            emails.push({
              id: seqno,
              subject: parsed.subject,
              from: parsed.from,
              date: parsed.date,
              text: parsed.text,
              html: parsed.html
            });
          });
        });
      });

      f.once('end', () => {
        resolve(emails);
      });

      f.once('error', (err) => {
        reject(err);
      });
    });
  });
}

/**
 * Envoie un email (simulé)
 */
async function sendEmail(accessToken, from, to, subject, text, html) {
  try {
    // Simule l'envoi d'email
    console.log(`[MAIL_SIM] Envoi email simulé: ${subject} -> ${to}`);
    
    return {
      success: true,
      messageId: 'simulated-' + Date.now(),
      simulated: true
    };
  } catch (error) {
    console.error('Erreur envoi email (simulé):', error);
    throw error;
  }
}

/**
 * Envoie un email de confirmation de connexion (simulé)
 */
async function sendConnectionConfirmation(accessToken, userEmail) {
  try {
    console.log(`[MAIL_SIM] Confirmation de connexion pour: ${userEmail}`);
    
    return {
      success: true,
      simulated: true,
      message: 'Email de confirmation simulé envoyé'
    };
  } catch (error) {
    console.error('Erreur confirmation (simulé):', error);
    throw error;
  }
}

/**
 * Vérifie l'état de connexion d'un utilisateur (simulé)
 */
async function checkAccountStatus(accessToken, userEmail) {
  try {
    // Test simple de connexion (simulé)
    console.log(`[SIM] Vérification statut pour: ${userEmail}`);
    
    return {
      connected: true,
      email: userEmail,
      status: 'active',
      simulated: true
    };
  } catch (error) {
    console.error('Erreur vérification compte (simulé):', error);
    return {
      connected: false,
      email: userEmail,
      status: 'inactive',
      error: error.message,
      simulated: true
    };
  }
}

module.exports = {
  connectGmailImap,
  listEmails,
  sendEmail,
  sendConnectionConfirmation,
  checkAccountStatus
};