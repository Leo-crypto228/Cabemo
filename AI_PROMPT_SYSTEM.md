# 🤖 SYSTEME D'INTELLIGENCE ARTIFICIELLE POUR CADEMO

## 📋 DESCRIPTION GLOBALE

Le système d'IA pour Cademo est conçu pour automatiser la gestion des fiches entreprises via les API Google My Business. L'IA agit comme un assistant humain, effectuant des tâches spécifiques sur les comptes Google validés.

## 🔐 PROCESSUS DE VALIDATION

### Étape 1 : Connexion OAuth via Email
1. L'utilisateur entre son email dans l'interface
2. Un lien de confirmation est généré et envoyé (ou disponible)
3. L'utilisateur clique sur "Oui, c'est moi" dans l'interface Google
4. Un proxy est créé pour ce compte utilisateur
5. L'IA obtient les permissions pour agir sur ce compte

### Étape 2 : Création du Proxy
- Stockage sécurisé des tokens OAuth (access_token, refresh_token)
- Validation de la connexion
- Prêt pour les actions IA

## 🤖 PROMPT SYSTÈME DE L'IA

Voici le prompt système utilisé par l'IA :

```
TU ES UN ASSISTANT SPÉCIALISÉ DANS LA GESTION DES FICHES ENTREPRISES GOOGLE MY BUSINESS.

TON RÔLE EST DE :
- Surveiller les fiches entreprises associées aux comptes validés
- Publier des avis, réponses, mises à jour pertinentes
- Gérer les interactions client de manière professionnelle
- Optimiser la visibilité locale des entreprises
- Agir UNIQUEMENT sur les comptes où tu as reçu l'autorisation explicite

RÈGLES STRICTES :
1. Ne jamais agir sans autorisation explicite
2. Toujours respecter les politiques Google
3. Être professionnel et utile dans toutes les interactions
4. Prioriser la qualité plutôt que la quantité
5. Signaler toute anomalie ou problème de sécurité
```

## 🔄 ACTIONS AUTORISÉES PAR L'IA

### Actions disponibles via `executeAction()` :

1. **`check_status`** - Vérifier l'état du compte
2. **`post_review`** - Publier un avis sur une fiche entreprise
3. **`send_email`** - Envoyer des emails de notification

### Exemple d'utilisation :
```javascript
// Poster un avis sur une fiche entreprise
await proxyManager.executeAction(userId, 'post_review', {
  businessId: 'your-business-id',
  reviewData: {
    rating: 5,
    comment: 'Excellent service!',
    reviewerName: 'Customer Name'
  }
});
```

## ⏱️ TEMPS DE RÉACTION

- **Démarrage immédiat** : dès que le proxy est créé
- **Actions continues** : selon la configuration du système
- **Surveillance active** : 24/7 sur les comptes validés

## 🔧 CONFIGURATION UTILISATEUR

### Variables d'environnement importantes :
- `GOOGLE_CLIENT_ID` - Identifiant client Google OAuth
- `GOOGLE_CLIENT_SECRET` - Secret client Google OAuth  
- `GOOGLE_REDIRECT_URI` - URI de redirection OAuth
- `MASTER_KEY` - Clé de chiffrement pour les tokens

### Processus complet :
1. Utilisateur clique "Vérifier mon mail"
2. Système lance le processus OAuth
3. Google demande "Oui, c'est moi"
4. Proxy créé automatiquement
5. IA active sur le compte
6. Actions automatiques sur les fiches entreprises

## 📊 MONITORING

Le système maintient un état de chaque proxy :
- Statut de connexion
- Dernière activité
- Permissions accordées
- Historique des actions

## ⚠️ SÉCURITÉ

- Tous les tokens sont chiffrés
- Accès limité aux permissions nécessaires
- Surveillance des abus potentiels
- Revocation immédiate en cas de problème

---

**NOTES POUR LE DÉVELOPPEMENT :**

Le système est maintenant opérationnel. Pour tester :
1. Accéder à `http://localhost:8080`
2. Cliquer sur "Vérifier mon mail"
3. Entrer un email valide
4. Suivre le processus OAuth Google
5. Confirmer "Oui, c'est moi"
6. L'IA sera active sur ce compte