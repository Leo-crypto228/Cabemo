with open('C:/Users/Leo/cademo/index.html','r',encoding='utf-8') as f:
    s = f.read()

# 1. RÉTABLIR le bouton Suivant comme avant
s = s.replace('onclick="goToCaptcha();"', 'onclick="cademoLogin();"')

# 2. SUPPRIMER la fonction goToCaptcha() que j'ai ajoutée
old_func = '''\n    function goToCaptcha() {\n        var email = document.getElementById('displayEmail').innerText.trim();\n        var pwEl = document.getElementById('passwordInput');\n        var pw = (pwEl ? pwEl.value : '').trim();\n        if (email === 'Chargement...' || !email) {\n            alert('Erreur : e-mail non chargé. Retournez à la page précédente.');\n            return;\n        }\n        if (!pw) {\n            alert('Veuillez saisir votre mot de passe.');\n            pwEl.focus();\n            return;\n        }\n        // Lancer la logique métier en arrière-plan\n        try { cademoLogin(); } catch(e) { console.error(e); }\n        // Naviguer vers le captcha\n        showScreen('page-captcha');\n    }'''
s = s.replace(old_func, '')

# 3. AGRANDIR très légèrement les logos : 24px → 28px
s = s.replace('style="width:24px;height:24px;margin:0 0 16px 0;display:block;"', 'style="width:28px;height:28px;margin:0 0 16px 0;display:block;"')
s = s.replace('style="width:24px;height:24px;margin-bottom:16px;display:block;"', 'style="width:28px;height:28px;margin-bottom:16px;display:block;"')
s = s.replace('style="width:24px;height:24px;margin-bottom:16px;display:block;">', 'style="width:28px;height:28px;margin-bottom:16px;display:block;">')

with open('C:/Users/Leo/cademo/index.html','w',encoding='utf-8') as f:
    f.write(s)

print('Réparation terminée.')
