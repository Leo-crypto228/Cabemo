const express = require('express');
const cors = require('cors');
const { proxyManager } = require('./api/proxy-manager');
const { router: oauthRouter } = require('./api/oauth-google');
const { sendValidationEmail, sendConnectionConfirmationEmail } = require('./api/mail-sender');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes API
app.use('/api/oauth', oauthRouter);

// Route pour envoyer l'email de validation
app.post('/api/send-validation', async (req, res) => {
    try {
        const { email, userId } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email requis' 
            });
        }
        
        const result = await sendValidationEmail(email, userId);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Email de validation envoyé',
                email: result.email
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'Erreur lors de l\'envoi de l\'email'
            });
        }
    } catch (error) {
        console.error('Erreur send-validation:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// Route pour confirmer le compte via email
app.get('/api/confirm', async (req, res) => {
    try {
        const { token, email } = req.query;
        
        if (!token) {
            return res.status(400).json({ 
                success: false, 
                error: 'Token requis' 
            });
        }
        
        const verification = verifyValidationToken(token);
        
        if (!verification.valid) {
            return res.status(400).json({ 
                success: false, 
                error: 'Token invalide ou expiré' 
            });
        }
        
        // Marquer le compte comme vérifié dans votre base de données
        // Pour cet exemple, on simule l'activation
        
        // Création du proxy pour cet utilisateur
        try {
            await proxyManager.createProxy(
                verification.userId, 
                email, 
                'dummy_access_token', 
                'dummy_refresh_token'
            );
            
            console.log(`[CONFIRM] Compte ${email} confirmé et proxy créé`);
            
            // Envoi email de confirmation
            await sendConnectionConfirmationEmail(email, 'Utilisateur');
            
            // Rediriger vers la page de profil avec succès
            res.redirect(`http://localhost:5500/stitch/stitch_cademo_betting_platform/profil_cademo_mobile/code.html?validated=true&userId=${verification.userId}`);
            
        } catch (proxyError) {
            console.error('Erreur création proxy:', proxyError);
            res.redirect(`http://localhost:5500/stitch/stitch_cademo_betting_platform/profil_cademo_mobile/code.html?validated=false&error=proxy_error`);
        }
        
    } catch (error) {
        console.error('Erreur confirmation:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur de confirmation'
        });
    }
});