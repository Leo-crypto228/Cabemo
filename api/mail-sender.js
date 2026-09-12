// Service d'envoi d'emails avec Nodemailer
const nodemailer = require('nodemailer');

// Configuration du transporteur SMTP
const transporterConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
};

// Création du transporteur avec gestion d'erreur
let transporter = null;

try {
  transporter = nodemailer.createTransporter(transporterConfig);
  console.log('[MAIL] Transporter Nodemailer initialisé avec succès');
} catch (error) {
  console.error('[MAIL] Erreur initialisation transporter:', error.message);
  transporter = null;
}

/**
 * Envoi d'email de validation réel
 */
async function sendValidationEmail(email, userId) {
  try {
    if (!transporter) {
      console.error('[MAIL] Transporter non initialisé - Envoi d\'email impossible');
      return {
        success: false,
        error: 'Service email non disponible'
      };
    }

    // Génération du lien de validation unique
    const validationLink = `http://localhost:3000/api/confirm?token=${generateValidationToken(userId)}&email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Validation de votre compte Cademo',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Validation de votre compte Cademo</h2>
          <p>Bonjour,</p>
          <p>Pour valider votre compte et activer l'accès permanent à votre boîte mail, veuillez cliquer sur le bouton ci-dessous :</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${validationLink}" 
               style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Valider mon compte
            </a>
          </div>
          
          <p>Si le bouton ci-dessus ne fonctionne pas, vous pouvez copier-coller ce lien dans votre navigateur :</p>
          <p style="word-break: break-all;">${validationLink}</p>
          
          <p><strong>Temps de validité :</strong> 24 heures</p>
          
          <p>Cordialement,<br/>L'équipe Cademo</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #777;">
            Ce message a été envoyé à l'adresse ${email}.<br/>
            Si vous n'avez pas demandé cette validation, veuillez ignorer ce message.
          </p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Email de validation envoyé avec succès à:', email);
    return {
      success: true,
      messageId: result.messageId,
      email: email
    };
  } catch (error) {
    console.error('[EMAIL] Erreur envoi email validation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Génère un token de validation unique
 */
function generateValidationToken(userId) {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return Buffer.from(`${userId}-${timestamp}-${random}`).toString('base64');
}

/**
 * Vérifie un token de validation
 */
function verifyValidationToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('ascii');
    const [userId, timestamp, random] = decoded.split('-');
    
    // Vérification de l'expiration (24h)
    const now = Date.now();
    const tokenTime = parseInt(timestamp);
    const isValid = (now - tokenTime) < (24 * 60 * 60 * 1000); // 24 heures
    
    return {
      valid: isValid,
      userId: userId
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Envoi d'email de confirmation de connexion
 */
async function sendConnectionConfirmationEmail(email, userName) {
  try {
    if (!transporter) {
      console.error('[MAIL] Transporter non initialisé - Envoi d\'email impossible');
      return {
        success: false,
        error: 'Service email non disponible'
      };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Accès permanent activé - Cademo',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Accès permanent activé</h2>
          <p>Bonjour ${userName || 'Utilisateur'},</p>
          <p>Nous confirmons que l'accès permanent à votre compte Gmail a été activé avec succès.</p>
          
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Statut:</strong> <span style="color: #4CAF50;">Activé</span></p>
            <p style="margin: 5px 0;">Compte: ${email}</p>
            <p style="margin: 5px 0;">Date: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>Votre compte est maintenant prêt à être utilisé par notre système d'IA pour effectuer des opérations automatisées.</p>
          
          <p>Cordialement,<br/>L'équipe Cademo</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #777;">
            Ce message a été envoyé à l'adresse ${email}.
          </p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Email de confirmation envoyé avec succès à:', email);
    return {
      success: true,
      messageId: result.messageId,
      email: email
    };
  } catch (error) {
    console.error('[EMAIL] Erreur envoi email confirmation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export des fonctions
module.exports = {
  sendValidationEmail,
  sendConnectionConfirmationEmail,
  generateValidationToken,
  verifyValidationToken
};