with open('C:/Users/Leo/cademo/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix remaining encoding issues
content = content.replace('caché par défaut', 'caché par défaut')
content = content.replace('Clé', 'Clé')
content = content.replace('Afin de proteger', 'Afin de protéger')
content = content.replace("n'etes pas un robot", "n'êtes pas un robot")
content = content.replace('une autre methode', 'une autre méthode')
content = content.replace('Confidentialite', 'Confidentialité')

# Fix spacing in captcha page
content = content.replace(
    '<div id="captcha-content" style="display:none;max-width:400px;margin:0 auto;padding-top:40px;">',
    '<div id="captcha-content" style="display:none;max-width:400px;margin:0 auto;padding-top:24px;">'
)
content = content.replace(
    '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style="width:48px;height:48px;margin-bottom:24px;">\n                <path fill="#EA4335"',
    '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style="width:48px;height:48px;margin-bottom:16px;">\n                <path fill="#EA4335"'
)

# Fix captcha avatar (replace emoji with SVG)
old_captcha_avatar = '<div style="width:32px;height:32px;border-radius:50%;background:#9e9e9e;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;">&#128100;</div>'
new_captcha_avatar = '''<div style="width:32px;height:32px;border-radius:50%;background:#9e9e9e;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <circle cx="12" cy="8" r="4"/>
                        <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
                    </svg>
                </div>'''
content = content.replace(old_captcha_avatar, new_captcha_avatar)

# Fix mail-info spacing
content = content.replace(
    '<div style="max-width:400px;margin:0 auto;padding-top:40px;">\n            <!-- Logo G Google -->',
    '<div style="max-width:400px;margin:0 auto;padding-top:24px;">\n            <!-- Logo G Google -->'
)

with open('C:/Users/Leo/cademo/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done fixing encoding and spacing')
