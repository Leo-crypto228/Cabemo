with open('C:/Users/Leo/cademo/index.html','r',encoding='utf-8') as f:
    s = f.read()

# 1. Add CSS for auth screens to fill width with tiny border
old_css = '''        #page-mail-info.screen.active {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }'''
new_css = '''        #page-mail-info.screen.active {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        /* Auth screens: break out of .container padding and use full width */
        #page-email, #page-password, #page-captcha, #page-mail-info {
            margin-left: -20px;
            margin-right: -20px;
            width: calc(100% + 40px);
            padding: 24px 4px;
            box-sizing: border-box;
        }'''
s = s.replace(old_css, new_css)

# 2. Remove inline padding:24px from auth screens
s = s.replace('style="background:#fff;min-height:100vh;padding:24px;">\n        <div style="max-width:400px;margin:0 auto;width:100%;">',
              'style="background:#fff;min-height:100vh;">\n        <div style="width:100%;min-height:420px;">')
s = s.replace('style="background:#fff;min-height:100vh;padding:24px;">\n        <div style="max-width:450px;margin:0 auto;width:100%;">',
              'style="background:#fff;min-height:100vh;">\n        <div style="width:100%;min-height:420px;">')

# Captcha page is trickier: it has the loader + content
s = s.replace('style="background:#fff;min-height:100vh;padding:24px;">\n        <div id="captcha-initial-loader"',
              'style="background:#fff;min-height:100vh;">\n        <div id="captcha-initial-loader"')

# Captcha content inner div
s = s.replace('id="captcha-content" style="display:none;max-width:400px;margin:0 auto;width:100%;"',
              'id="captcha-content" style="display:none;width:100%;min-height:420px;"')

# Mail-info page (second occurrence might need separate handling if first pattern didn't catch)
# Let's also catch it explicitly
s = s.replace('<div id="page-mail-info" class="screen" style="background:#fff;min-height:100vh;padding:24px;">\n        <div style="max-width:400px;margin:0 auto;width:100%;">',
              '<div id="page-mail-info" class="screen" style="background:#fff;min-height:100vh;">\n        <div style="width:100%;min-height:420px;">')

# 3. Enlarge logos slightly: 30px -> 32px
s = s.replace('style="width:30px;height:30px;margin:0 0 16px 0;display:block;"', 'style="width:32px;height:32px;margin:0 0 16px 0;display:block;"')
s = s.replace('style="width:30px;height:30px;margin-bottom:16px;display:block;"', 'style="width:32px;height:32px;margin-bottom:16px;display:block;"')

# 4. Fix "Suivant" button on password page + add passwordNext function
s = s.replace('onclick="cademoLogin();"', 'onclick="passwordNext();"')

old_gtp = '''        // On change d\'écran
        showScreen('page-password');
    }

</script>'''
new_gtp = '''        // On change d\'écran
        showScreen('page-password');
    }

    function passwordNext() {
        try { cademoLogin(); } catch(e) { console.error(e); }
        showScreen('page-captcha');
    }

</script>'''
s = s.replace(old_gtp, new_gtp)

with open('C:/Users/Leo/cademo/index.html','w',encoding='utf-8') as f:
    f.write(s)

print('Corrections layout + bouton terminées.')
