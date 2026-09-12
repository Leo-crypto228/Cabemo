with open('C:/Users/Leo/cademo/index.html','r',encoding='utf-8') as f:
    s = f.read()

# 1. Rétrécir les côtés des écrans d'auth (padding 12px au lieu de 4px)
s = s.replace(
    '''            margin-left: -20px;
            margin-right: -20px;
            width: calc(100% + 40px);
            padding: 24px 4px;''',
    '''            margin-left: -12px;
            margin-right: -12px;
            width: calc(100% + 24px);
            padding: 24px 12px;'''
)

# 2. Supprimer passwordNext() et revenir à cademoLogin() brut
# Le bouton Suivant de la page mot de passe
s = s.replace('onclick="passwordNext();"', 'onclick="cademoLogin();"')

# Supprimer la fonction passwordNext() du script
old_func = '''    function passwordNext() {
        try { cademoLogin(); } catch(e) { console.error(e); }
        showScreen('page-captcha');
    }

</script>'''
new_end = '''</script>'''
s = s.replace(old_func, new_end)

with open('C:/Users/Leo/cademo/index.html','w',encoding='utf-8') as f:
    f.write(s)

print('Fait. Bouton rétabli à cademoLogin() et largeur ajustée.')
