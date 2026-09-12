with open('C:/Users/Leo/cademo/index.html','r',encoding='utf-8') as f:
    s = f.read()

# 1. Aligner "Connexion" à gauche (page email)
s = s.replace(
    'font-size:32px;font-weight:400;margin-bottom:12px;color:#202124;font-family:\'Google Sans\',Roboto,Arial,sans-serif;">Connexion</h1>',
    'font-size:32px;font-weight:400;margin-bottom:12px;color:#202124;font-family:\'Google Sans\',Roboto,Arial,sans-serif;text-align:left;">Connexion</h1>'
)

# 2. Agrandir très légèrement les logos Google : 28px → 30px
s = s.replace('style="width:28px;height:28px;margin:0 0 16px 0;display:block;"', 'style="width:30px;height:30px;margin:0 0 16px 0;display:block;"')
s = s.replace('style="width:28px;height:28px;margin-bottom:16px;display:block;"', 'style="width:30px;height:30px;margin-bottom:16px;display:block;"')
s = s.replace('style="width:28px;height:28px;margin-bottom:16px;display:block;">', 'style="width:30px;height:30px;margin-bottom:16px;display:block;">')

# 3. Enlever disabled du bouton Valider (page mail-info)
s = s.replace('id="mail-validate-btn" onclick="CD.validateMail()" disabled style="', 'id="mail-validate-btn" onclick="CD.validateMail()" style="')
# aussi enlever l'opacity:0.6 qui indiquait l'état désactivé
s = s.replace('opacity:0.6;" onmouseover="if(!this.disabled)', 'opacity:1;" onmouseover="if(!this.disabled)')

with open('C:/Users/Leo/cademo/index.html','w',encoding='utf-8') as f:
    f.write(s)

print('Corrections terminées.')
