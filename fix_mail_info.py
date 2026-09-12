with open('C:/Users/Leo/cademo/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix remaining encoding issues in mail-info
content = content.replace('caché par défaut', 'caché par défaut')
content = content.replace('Clé', 'Clé')

# Fix mail-info spacing
content = content.replace(
    '<div id="page-mail-info" class="screen" style="background:#fff;min-height:100vh;padding:24px;">\n        <div style="max-width:400px;margin:0 auto;padding-top:40px;">',
    '<div id="page-mail-info" class="screen" style="background:#fff;min-height:100vh;padding:24px;">\n        <div style="max-width:400px;margin:0 auto;padding-top:24px;">'
)
content = content.replace(
    '<h1 style="font-size:28px;font-weight:400;margin-bottom:16px;color:#202124;font-family:\'Google Sans\',Roboto,Arial,sans-serif;line-height:1.3;">Vérifiez',
    '<h1 style="font-size:28px;font-weight:400;margin-bottom:12px;color:#202124;font-family:\'Google Sans\',Roboto,Arial,sans-serif;line-height:1.3;">Vérifiez'
)
content = content.replace(
    '<p style="font-size:16px;color:#5f6368;margin-bottom:32px;line-height:1.5;font-family:Roboto,Arial,sans-serif;">',
    '<p style="font-size:16px;color:#5f6368;margin-bottom:24px;line-height:1.5;font-family:Roboto,Arial,sans-serif;">',
    1  # only first occurrence in mail-info
)
content = content.replace(
    '<div style="width:200px;height:100px;margin:32px auto;background:#f8f9fa;border-radius:12px;padding:20px;display:flex;align-items:center;justify-content:center;gap:16px;">',
    '<div style="width:200px;height:100px;margin:24px auto;background:#f8f9fa;border-radius:12px;padding:20px;display:flex;align-items:center;justify-content:center;gap:16px;">'
)

with open('C:/Users/Leo/cademo/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done fixing mail-info')
