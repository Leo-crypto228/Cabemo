# CADEMO - Site de Paris Sportifs

## Structure du projet

```
cademo/
├── stitch/
│   └── stitch_cademo_betting_platform/
│       ├── profil_cademo_mobile/
│       │   ├── code.html           # Page profil avec QR Code
│       │   └── profile-qr.js       # Fonctions de validation
│       ├── paris_cademo_mobile/
│       ├── mes_paris_cademo_mobile/
│       ├── ticket_cademo_mobile/
│       └── landing_page_cademo/
├── api/
├── worker/
│   └── cademo-proxy.js           # Proxy IA pour accès comptes
├── tools/
└── supabase/
```

## Fonctionnalités implémentées

### 1. Section Profil avec QR Code
- Interface complète de gestion de compte
- Processus de validation par email
- Accès sécurisé avec QR Code
- Message de confidentialité conforme

### 2. Intégration IA (Agent Proxy)
- Fichier `cademo-proxy.js` pour automatiser les actions
- Accès aux comptes via proxy après validation
- Exemple d'action : vérification de météo

### 3. Système de validation
- Blocage d'accès si compte non validé
- Interface de validation claire
- Processus de confirmation par email
- Accès permanent après validation

## Documentation technique

### Fichier code.html (profil)
Contient les éléments suivants :
- QR Code avec interface de validation
- Bouton "Oui c'est moi, je valide l'interception"
- Message explicatif sur l'accès permanent
- Section de sécurité avec information de confidentialité

### Fichier cademo-proxy.js (IA)
```javascript
// Exemple de fonctionnalité IA
async function executeIAAction(actionType, accountData) {
    switch(actionType) {
        case 'weather':
            // Vérification météo (exemple)
            return await simulateWeatherRequest();
        case 'account-check':
            // Vérification données compte
            return await checkAccountStatus(accountData);
        default:
            return null;
    }
}
```

## Processus de validation complet

1. **Accès bloqué** si compte non validé
2. **Demande de validation** par email
3. **Validation utilisateur** via interface
4. **Accès permanent** après validation
5. **IA peut accéder** au compte via proxy