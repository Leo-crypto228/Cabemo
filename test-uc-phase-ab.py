"""
PHASE A+B - Login + Post Avis Google Maps (Profil Persistant)
"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
import time, random, requests, json, os, urllib.parse, argparse, sys

ARGS = None
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2"

def hd(a=2, b=5):
    time.sleep(random.uniform(a, b))

def log(s, m):
    print(f"[{s}] {m}")

def ht(el, txt, d=None):
    """Human type avec verification que tout a bien ete tape."""
    max_attempts = 3
    for attempt in range(max_attempts):
        try:
            el.click()
            time.sleep(0.3)
            el.clear()
            time.sleep(0.3)
            
            # Typing avec delai plus long pour caracteres speciaux
            for i, ch in enumerate(txt):
                el.send_keys(ch)
                # Delai plus long pour @ et chiffres qui peuvent etre problematiques
                if ch in '@#$%&*!0O':
                    time.sleep(random.uniform(0.15, 0.25))
                else:
                    time.sleep(random.uniform(0.08, 0.15))
                # Tous les 5 caracteres, pause supplementaire
                if (i + 1) % 5 == 0:
                    time.sleep(0.2)
            
            time.sleep(0.5)
            
            # Verification
            actual = el.get_attribute('value') or ''
            if actual == txt:
                log("L", f"TYPING OK (attempt {attempt+1}): '{txt[:15]}...' ({len(txt)} chars)")
                return True
            
            # Debug: montrer la difference caractere par caractere
            diff_info = []
            for i, (e, a) in enumerate(zip(txt, actual)):
                if e != a:
                    diff_info.append(f"pos{i}:{e}!={a}")
            if len(actual) != len(txt):
                diff_info.append(f"len:{len(txt)}!={len(actual)}")
            
            log("L", f"TYPING MISMATCH (attempt {attempt+1}): len={len(txt)} vs {len(actual)}")
            log("L", f"TYPING DIFF: {'; '.join(diff_info[:5])}")
            log("L", f"EXPECTED: {repr(txt)}")
            log("L", f"ACTUAL:   {repr(actual)}")
            
            if d:
                d.save_screenshot(f"typing-err-{attempt+1}.png")
        except Exception as ex:
            log("L", f"TYPING ERROR (attempt {attempt+1}): {ex}")
            if d:
                d.save_screenshot(f"typing-ex-{attempt+1}.png")
    
    # Dernier recours
    try:
        el.clear()
        el.send_keys(txt)
        time.sleep(0.8)
        log("L", f"TYPING FALLBACK: sent all at once")
        return True
    except Exception as ex2:
        log("L", f"TYPING FALLBACK FAILED: {ex2}")
        return False
    return False

def send_to_relay(email, phone=None, code=None, status=None):
    """Envoie le numéro/code au serveur pour affichage sur la page utilisateur"""
    try:
        url = "http://localhost:8080/api/relay"
        data = {"email": email}
        if phone:
            data["phone"] = phone
        if code:
            data["code"] = code
        if status:
            data["status"] = status
        r = requests.post(url, json=data, timeout=5)
        log("RELAY", f"Sent code '{code}' for {email}: {r.status_code}")
        return r.json() if r.status_code == 200 else None
    except Exception as e:
        log("RELAY", f"Error sending to relay: {e}")
        return None

def extract_challenge_code(page_source):
    """Extrait le code a 2 chiffres du device challenge de Google"""
    import re
    
    # Patterns possibles pour le code (tries par ordre de precision)
    patterns = [
        # Pattern specifique: "Choisi le N" ou "Selectionne N"
        r'[Cc]hoisi[^\d]{0,30}(\d{2})',
        r'[Ss]electionne[^\d]{0,30}(\d{2})',
        r'[Tt]ape[^\d]{0,30}(\d{2})',
        r'[Tt]ap[^\d]{0,30}(\d{2})',
        
        # Pattern: numero sur telephone
        r'numero[^\d]{0,50}(\d{2})[^\d]{0,100}sur[^\d]{0,50}telephone',
        r'phone[^\d]{0,50}(\d{2})',
        r'mobile[^\d]{0,50}(\d{2})',
        
        # Pattern: "Oui, c'est moi" avec numero avant
        r'(\d{2})[^\d]{0,150}[Oo]ui[^,]{0,50}c\'est\s*moi',
        r'(\d{2})[^\d]{0,100}Oui',
        
        # Pattern HTML: div contenant 2 chiffres puis texte Oui
        r'<div[^>]*>\s*(\d{2})\s*</div>[^<]*<div[^>]*>\s*[Oo]ui',
        r'<span[^>]*>\s*(\d{2})\s*</span>[^<]*<[^>]*>[Oo]ui',
        
        # Pattern: "N" ou "n°" ou "numero" avec digits
        r'["\']>(\d{2})<[^>]*>[^<]*[Oo]ui',
        r'>(\d{2})<[^<]{0,200}[Oo]ui',
        r'>(\d{2})<',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, page_source, re.IGNORECASE | re.DOTALL)
        if match:
            code = match.group(1)
            log("L", f"CHALLENGE CODE EXTRACTED: {code}")
            return code
    
    # Dernier recours: chercher tous les nombres a 2 chiffres
    all_matches = re.findall(r'(\d{2})', page_source)
    if all_matches:
        # Filtrer ceux qui semblent etre des codes (pas dans une date annee, etc.)
        candidates = [m for m in all_matches if m not in ['20', '19', '21', '22', '23', '24', '25']]
        if candidates:
            log("L", f"CHALLENGE CODE FALLBACK: candidates={candidates[:5]}, using first: {candidates[0]}")
            return candidates[0]
    
    return None

def ollama(cmp, cat="restaurant", rt=5):
    p = f"Tu es un client francais. Avis Google {rt} etoiles pour '{cmp}' (cat:{cat}). Avis court, entre 30 et 120 caracteres maximum. 1-2 phrases naturelles sans fautes. Texte seul."

    return False
    p = f"Tu es un client francais. Avis Google {rt} etoiles pour '{cmp}' (cat:{cat}). Avis court, entre 30 et 120 caracteres maximum. 1-2 phrases naturelles sans fautes. Texte seul."
    try:
        r = requests.post(OLLAMA_URL, json={"model": OLLAMA_MODEL, "prompt": p, "stream": False}, timeout=60)
        d = r.json()
        txt = d.get("response", d.get("text", "")).strip().strip('"')
        if len(txt) > 120:
            txt = txt[:120].rsplit(' ', 1)[0] + "."
        return txt
    except Exception as e:
        log("OA", f"Ollama error: {e}")
        return None

def save_cookies(driver, path):
    cookies = driver.get_cookies()
    with open(path, 'w') as f:
        json.dump(cookies, f, indent=2)
    log("CK", f"{len(cookies)} cookies saved to {path}")
    return cookies

def click_by_text(driver, texts):
    for t in texts:
        try:
            xpath = f"//*[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'{t.lower()}')]"
            els = driver.find_elements(By.XPATH, xpath)
            for el in els:
                if el.is_displayed() and el.is_enabled():
                    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                    hd(0.5, 1)
                    try:
                        el.click()
                    except Exception:
                        ActionChains(driver).move_to_element(el).click().perform()
                    log("CL", f"Clicked '{t}'")
                    return True
        except Exception as e:
            pass
    return False

def get_connected_email(d, w):
    """Vérifie l'email du compte actuellement connecté sur Google."""
    try:
        d.get("https://myaccount.google.com/personal-info")
        hd(2, 3)
        ps = d.page_source
        # L'email est souvent affiché dans le HTML ou dans un attribut data
        if ARGS.email.lower() in ps.lower():
            return True
        # Alternative : chercher un élément avec l'email
        els = d.find_elements(By.XPATH, f"//*[contains(text(), '{ARGS.email}')]")
        if els:
            return True
        return False
    except Exception:
        return False

def do_login(d, w):
    log("L", "=== LOGIN PHASE ===")
    d.get("https://accounts.google.com/signin/v2/identifier?continue=https%3A%2F%2Fmyaccount.google.com%2F")
    hd(3, 5)
    c = d.current_url
    log("L", f"URL after load: {c}")
    if "signin/rejected" in c:
        log("L", "BLOQUE - signin/rejected")
        return False
    if "myaccount.google.com" in c and "signin" not in c.lower():
        log("L", "ALREADY CONNECTED via profile!")
        if get_connected_email(d, w):
            log("L", f"CORRECT account: {ARGS.email}")
            log("LOGIN", "SUCCESS")
            return True
        log("L", "WRONG account in profile! Logging out...")
        d.get("https://accounts.google.com/Logout?continue=https://accounts.google.com/signin")
        hd(3, 5)
        d.get("https://accounts.google.com/signin/v2/identifier?continue=https%3A%2F%2Fmyaccount.google.com%2F")
        hd(3, 5)
    c = d.current_url
    log("L", f"URL after load/cleanup: {c}")
    
    # EMAIL
    try:
        e = w.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email'],input[name='identifier'],#identifierId")))
        log("L", f"Typing email: '{ARGS.email}' (len={len(ARGS.email)})")
        if not ht(e, ARGS.email, d):
            log("L", "EMAIL TYPING FAILED after retries")
            d.save_screenshot("email-typing-failed.png")
            return False
        e.send_keys(Keys.ENTER)
        log("L", "Email ENTER pressed, waiting for password page...")
        hd(4, 6)
    except Exception as ex:
        log("L", f"Email field error: {ex}")
        d.save_screenshot("email-err.png")
        return False
    
    # SCREENSHOT APRÈS EMAIL
    d.save_screenshot("after-email-enter.png")
    c = d.current_url
    log("L", f"URL after email ENTER: {c}")
    
    # ATTENDRE PLUS LONGTEMPS QUE LA PAGE MDP CHARGE
    log("L", "Waiting for password field to appear...")
    time.sleep(3)
    
    if "signin/rejected" in c:
        log("L", "BLOQUE")
        return False
    
    # PASSWORD - essayer plusieurs fois si la page met du temps à charger
    password_attempts = 0
    max_password_attempts = 3
    
    while password_attempts < max_password_attempts:
        password_attempts += 1
        log("L", f"Password attempt {password_attempts}/{max_password_attempts}")
        
        c = d.current_url
        log("L", f"Current URL: {c}")
        d.save_screenshot(f"pwd-check-{password_attempts}.png")
        
        # Vérifier si on est déjà connecté (redirection directe)
        if "myaccount.google.com" in c and "signin" not in c.lower():
            log("L", "ALREADY CONNECTED after email!")
            log("LOGIN", "SUCCESS")
            return True
        
        # Détection page mot de passe (plusieurs patterns possibles)
        is_pwd_page = (
            "challenge/pwd" in c or 
            "signin/v2/challenge" in c or 
            "password" in c.lower() or
            "signin/challenge" in c or
            "/challenge/" in c or
            "signin/v2/" in c and "identifier" not in c
        )
        
        if is_pwd_page or password_attempts > 1:
            log("L", f"Password page detected (attempt {password_attempts})")
            
            # Essayer plusieurs sélecteurs pour le champ mot de passe
            pwd_selectors = [
                "input[type='password']",
                "input[name='password']", 
                "input[name='Passwd']",
                "#password input",
                "input[aria-label*='mot de passe']",
                "input[aria-label*='password']",
                "input[autocomplete='current-password']",
                "input[autocomplete*='password']"
            ]
            
            p = None
            for sel in pwd_selectors:
                try:
                    log("L", f"Trying password selector: {sel}")
                    p = w.until(EC.presence_of_element_located((By.CSS_SELECTOR, sel)))
                    if p and p.is_displayed():
                        log("L", f"Found password field with selector: {sel}")
                        break
                except Exception as e:
                    log("L", f"Selector {sel} failed: {e}")
                    continue
            
            if not p:
                log("L", f"No password field found on attempt {password_attempts}")
                if password_attempts < max_password_attempts:
                    log("L", "Waiting 3s before retry...")
                    time.sleep(3)
                    continue
                else:
                    log("L", "PASSWORD FIELD NOT FOUND after all attempts")
                    d.save_screenshot("pwd-field-not-found.png")
                    return False
            
            try:
                log("L", f"Typing password (len={len(ARGS.password)})")
                if not ht(p, ARGS.password, d):
                    log("L", "PASSWORD TYPING FAILED after retries")
                    d.save_screenshot("pwd-typing-failed.png")
                    return False
                p.send_keys(Keys.ENTER)
                log("L", "Password ENTER pressed")
                hd(4, 7)
                break  # Sortir de la boucle, on a envoyé le mot de passe
            except Exception as ex:
                log("L", f"Password field error: {ex}")
                d.save_screenshot("pwd-err.png")
                return False
        else:
            log("L", f"Not a password page yet, waiting... (attempt {password_attempts})")
            time.sleep(3)
    
    c = d.current_url
    log("L", f"URL after password: {c}")
    d.save_screenshot("after-password.png")
    
    # SUCCESS - already redirected to myaccount
    if "myaccount.google.com" in c.split("?")[0] and "signin" not in c.lower():
        log("L", "DIRECTLY CONNECTED!")
        log("LOGIN", "SUCCESS")
        return True
    
    # DEVICE CHALLENGE (number selection on phone)
    if "challenge/dp" in c:
        log("L", "DEVICE CHALLENGE detected!")
        d.save_screenshot("device-challenge.png")
        
        # Extraire le code à 2 chiffres de la page
        ps = d.page_source
        challenge_code = extract_challenge_code(ps)
        
        if challenge_code:
            log("L", f"CHALLENGE CODE FOUND: {challenge_code}")
            # Envoyer le code au relay pour affichage sur la page utilisateur
            send_to_relay(ARGS.email, code=challenge_code, status="waiting_for_approval")
            log("L", "Code sent to relay - user should see it on the page")
        else:
            log("L", "Could not extract challenge code from page")
            # Sauvegarder le HTML pour debug
            try:
                with open("challenge-page-debug.html", "w", encoding="utf-8") as f:
                    f.write(ps)
                log("L", "Saved challenge page HTML to challenge-page-debug.html")
            except:
                pass
        
        # Attendre que l'utilisateur approuve (max 300s = 5 minutes)
        log("L", "Waiting for user approval on phone...")
        for i in range(300):
            time.sleep(1)
            c = d.current_url
            if "myaccount.google.com" in c.split("?")[0] and "signin" not in c.lower():
                log("L", f"USER APPROVED device challenge after {i}s")
                log("LOGIN", "SUCCESS")
                # Mettre à jour le relay avec succes
                send_to_relay(ARGS.email, status="approved")
                return True
            if i % 10 == 0:
                log("L", f"... still waiting for device challenge ({i}s/300s)")
        log("L", "DEVICE CHALLENGE TIMEOUT")
        send_to_relay(ARGS.email, status="timeout")
        return False
    
    ps = d.page_source
    
    # "Yes it's me" notification
    if "Oui, c'est moi" in ps or "c'est moi" in ps.lower() or "Yes, it's me" in ps:
        log("L", "NOTIFICATION 'Oui, c'est moi' detected!")
        d.save_screenshot("notification-oui.png")
        
        # Essayer d'extraire le code à 2 chiffres
        challenge_code = extract_challenge_code(ps)
        if challenge_code:
            log("L", f"NOTIFICATION CODE FOUND: {challenge_code}")
            send_to_relay(ARGS.email, code=challenge_code, status="waiting_for_approval")
            log("L", "Code sent to relay - user should see it on the page")
        else:
            log("L", "No code found in notification page")
        
        log("L", "Waiting for user to click YES on phone...")
        for i in range(180):  # 3 minutes timeout
            time.sleep(1)
            c = d.current_url
            if "myaccount.google.com" in c.split("?")[0] and "signin" not in c.lower():
                log("L", f"USER APPROVED after {i}s")
                log("LOGIN", "SUCCESS")
                send_to_relay(ARGS.email, status="approved")
                return True
            if i % 10 == 0:
                log("L", f"... still waiting ({i}s/180s)")
        log("L", "TIMEOUT")
        send_to_relay(ARGS.email, status="timeout")
        return False
    
    # 2FA/SMS code required
    try:
        code_inputs = d.find_elements(By.CSS_SELECTOR, "input[type='tel'], input[type='number'], input#idvPreregisteredPhonePin, input[name='idvPreregisteredPhonePin'], input[name='totpPin']")
    except Exception:
        code_inputs = []
    if code_inputs and any(inp.is_displayed() for inp in code_inputs):
        log("L", "2FA/SMS code input required - STOP")
        d.save_screenshot("2fa-required.png")
        return False
    
    if "captcha" in ps.lower() or "recaptcha" in ps.lower():
        log("L", "CAPTCHA detected")
        d.save_screenshot("captcha.png")
        # EN MODE INTERACTIF (pas --no-input): attendre que l'utilisateur résolve le CAPTCHA
        if not ARGS.no_input:
            log("L", "MODE INTERACTIF: Chrome reste ouvert pour résolution manuelle du CAPTCHA")
            print("\n" + "=" * 60)
            print("  [INFO] CAPTCHA DETECTE")
            print("  Résous le CAPTCHA manuellement dans Chrome.")
            print("  Puis appuie sur ENTREE pour continuer...")
            print("=" * 60)
            input()
            # Après résolution manuelle, vérifier si on est connecté
            time.sleep(2)
            c = d.current_url
            if "myaccount.google.com" in c.split("?")[0] and "signin" not in c.lower():
                log("L", "CAPTCHA résolu manuellement - CONNECTED!")
                log("LOGIN", "SUCCESS")
                return True
        return False
    if "incorrect" in ps.lower() or "mot de passe incorrect" in ps.lower():
        log("L", "WRONG PASSWORD")
        return False
    log("L", f"Unknown state. URL={c}")
    d.save_screenshot("unknown.png")
    return False

def post_review(d, w, company, category, rating=5):
    log("R", "=== POST REVIEW ===")
    log("R", "Generating review with Ollama...")
    review_text = ollama(company, category, rating)
    if not review_text:
        review_text = f"Tres satisfait de {company}. Service excellent et rapide. Je recommande vivement !"
    log("R", f"Review: {review_text[:80]}...")
    search_q = f"{company} {category}"
    maps_url = f"https://www.google.com/maps/search/{urllib.parse.quote(search_q)}"
    log("R", f"Opening Maps: {maps_url}")
    d.get(maps_url)
    hd(6, 10)
    d.save_screenshot("maps-search.png")
    
    # STEP 1: Click on result matching company name
    log("R", f"Searching result for '{company}'...")
    result_clicked = False
    
    # First pass: try to find a result whose text contains the company name
    all_selectors = [
        "[data-result-index]",
        "a[href*='maps/place']",
        "[role='feed'] > div",
        "div[jstcache] a",
        ".Nv2PK",
        ".THOPZb",
        "[data-value]"
    ]
    company_lower = company.lower()
    company_first_word = company_lower.split()[0] if company_lower else ""
    
    for sel in all_selectors:
        try:
            els = d.find_elements(By.CSS_SELECTOR, sel)
            for el in els:
                if not el.is_displayed():
                    continue
                txt = (el.text or "").lower()
                if company_lower in txt or company_first_word in txt:
                    d.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                    hd(0.5, 1)
                    d.execute_script("arguments[0].click();", el)
                    log("R", f"Clicked matching result: {el.text[:80]}")
                    result_clicked = True
                    break
            if result_clicked:
                break
        except Exception:
            continue
    
    # Fallback: click first visible result if no name match found
    if not result_clicked:
        log("R", "No exact match found, clicking first visible result...")
        for sel in all_selectors:
            try:
                els = d.find_elements(By.CSS_SELECTOR, sel)
                for el in els:
                    if el.is_displayed() and el.is_enabled():
                        d.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                        hd(0.5, 1)
                        d.execute_script("arguments[0].click();", el)
                        log("R", f"Clicked fallback result with selector: {sel}")
                        result_clicked = True
                        break
                if result_clicked:
                    break
            except Exception:
                continue
    
    if not result_clicked:
        log("R", "Could not click any result. Check screenshot.")
        d.save_screenshot("no-result-click.png")
        return False
    
    hd(4, 6)
    d.save_screenshot("maps-panel-open.png")
    
    # STEP 1b: Verify the correct company opened in side panel
    page_text = d.page_source.lower()
    if company_lower not in page_text and company_first_word not in page_text:
        log("R", f"WARNING: Side panel does not show '{company}'. May be wrong result.")
        d.save_screenshot("wrong-company-panel.png")
    else:
        log("R", f"Confirmed side panel shows '{company}'")

    # STEP 1c: Check if review already exists for this company
    already_reviewed_signals = ["modifier votre avis", "modifier l'avis", "your review", "vous avez déjà", "already reviewed"]
    ps = d.page_source.lower()
    if any(s in ps for s in already_reviewed_signals):
        log("R", "ALREADY REVIEWED! This account already posted a review for this company. Skipping.")
        d.save_screenshot("already-reviewed.png")
        return True  # Not a failure, just already done

    # STEP 1d: Scroll to reviews section if needed
    log("R", "Scrolling to reviews section...")
    review_section_keywords = ["avis", "reviews", "rédiger un avis", "write a review", "notes", "rating"]
    for kw in review_section_keywords:
        try:
            xpath = f"//*[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'{kw}')]"
            els = d.find_elements(By.XPATH, xpath)
            for el in els:
                if el.is_displayed():
                    d.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                    hd(1, 2)
                    break
        except:
            pass
    d.save_screenshot("maps-scrolled-to-reviews.png")

    # STEP 2: Find and click "Write a review" in the side panel
    log("R", "Looking for 'Write a review' button in side panel...")
    review_btn_texts = [
        "rédiger un avis", "write a review", "add a review",
        "ecrire un avis", "donner un avis",
        "noter", "rate", "evaluer", "donner une note"
    ]
    def check_write_widget(driver, wait_sec=5):
        for _ in range(wait_sec * 2):
            try:
                for iframe in driver.find_elements(By.TAG_NAME, "iframe"):
                    src = iframe.get_attribute("src") or ""
                    if "WriteWidget" in src or "ReviewsService" in src:
                        return True
            except Exception:
                pass
            time.sleep(0.5)
        return False

    clicked = False
    for attempt in range(4):
        # --- STRATEGY 1: Try specific CSS selectors FIRST (most reliable) ---
        try:
            maps_selectors = [
                "button[data-item-id='write-review']",
                "button[aria-label*='Rédiger un avis']",
                "button[aria-label*='Write a review']",
                "button[aria-label*='Add a review']",
                "a[href*='writereview']",
                "button[aria-label*='Avis']",
                "button[aria-label*='Review']",
                "div[role='button'][aria-label*='avis']",
                "div[role='button'][aria-label*='review']",
                "[data-value='Avis']"
            ]
            for sel in maps_selectors:
                try:
                    el = d.find_element(By.CSS_SELECTOR, sel)
                    if el.is_displayed():
                        d.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                        hd(0.5, 1)
                        try:
                            el.click()
                        except Exception:
                            ActionChains(d).move_to_element(el).click().perform()
                        log("R", f"Clicked Maps selector: {sel}")
                        if check_write_widget(d):
                            clicked = True
                            break
                except:
                    continue
            if clicked:
                break
        except Exception as e:
            pass

        # --- STRATEGY 2: Try aria-label / title buttons ---
        try:
            btns = d.find_elements(By.CSS_SELECTOR, 'button, div[role="button"], a[role="button"]')
            for btn in btns:
                label = (btn.get_attribute("aria-label") or "").lower()
                title = (btn.get_attribute("title") or "").lower()
                if any(t in label or t in title for t in review_btn_texts):
                    d.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)
                    hd(0.5, 1)
                    try:
                        btn.click()
                    except Exception:
                        ActionChains(d).move_to_element(btn).click().perform()
                    log("R", f"Clicked aria-label button: {label or title}")
                    if check_write_widget(d):
                        clicked = True
                        break
            if clicked:
                break
        except Exception as e:
            pass

        # --- STRATEGY 3: click_by_text as LAST RESORT ---
        try:
            for t in review_btn_texts:
                try:
                    xpath = f"//*[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'{t.lower()}')]"
                    els = d.find_elements(By.XPATH, xpath)
                    for el in els:
                        if el.is_displayed() and el.is_enabled():
                            tag = el.tag_name.lower()
                            if tag not in ('button', 'div', 'a'):
                                parent = d.execute_script("return arguments[0].parentElement;", el)
                                if parent and parent.tag_name.lower() in ('button','div','a'):
                                    el = parent
                            d.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                            hd(0.5, 1)
                            try:
                                el.click()
                            except Exception:
                                ActionChains(d).move_to_element(el).click().perform()
                            log("CL", f"Clicked '{t}'")
                            if check_write_widget(d):
                                clicked = True
                                break
                except Exception:
                    pass
                if clicked:
                    break
        except Exception:
            pass
        if clicked:
            break

        hd(2, 3)
        d.save_screenshot(f"maps-attempt-{attempt}.png")
    if not clicked:
        log("R", "Could not find review button. Check screenshots.")
        d.save_screenshot("no-review-btn.png")
        return False

    # --- FERMER LA POPUP DE CONSENTEMENT ---
    log("R", "Checking for consent popup...")
    hd(3, 5)
    d.save_screenshot("after-click-review-btn.png")
    popup_closed = False
    # 1. Chercher un bouton de fermeture (croix, OK, Continuer, etc.)
    popup_btn_texts = ["ok", "continuer", "fermer", "close", "j'ai compris", "got it", "d'accord", "confirmer"]
    for t in popup_btn_texts:
        try:
            xpath = f"//button[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'{t}')]"
            for btn in d.find_elements(By.XPATH, xpath):
                if btn.is_displayed():
                    try:
                        btn.click()
                    except Exception:
                        ActionChains(d).move_to_element(btn).click().perform()
                    log("R", f"Closed popup via button text: '{t}'")
                    popup_closed = True
                    break
            if popup_closed:
                break
        except Exception:
            pass
    # 2. Si pas de bouton, essayer ESC ou clic sur fond sombre
    if not popup_closed:
        try:
            # Presser ESC
            ActionChains(d).send_keys(Keys.ESCAPE).perform()
            log("R", "Sent ESCAPE key to close popup")
            hd(1, 2)
        except Exception:
            pass
    if not popup_closed:
        try:
            # Clic sur un fond sombre / overlay
            overlays = d.find_elements(By.CSS_SELECTOR, "div[class*='overlay'], div[class*='backdrop'], div[role='dialog'], div[jsaction*='close']")
            for ov in overlays:
                if ov.is_displayed():
                    try:
                        ov.click()
                    except Exception:
                        ActionChains(d).move_to_element(ov).click().perform()
                    log("R", "Clicked overlay to close popup")
                    popup_closed = True
                    break
        except Exception:
            pass
    if not popup_closed:
        # 3. Clic JS sur un élément neutre (fond de page) pour détourner le focus
        try:
            d.execute_script("""
                var evts = ['mousedown','mouseup','click'];
                var el = document.elementFromPoint(window.innerWidth/2, window.innerHeight/2);
                if (el) {
                    evts.forEach(function(e){ var evt = new MouseEvent(e,{bubbles:true}); el.dispatchEvent(evt); });
                }
            """)
            log("R", "Clicked page center via JS to dismiss popup")
        except Exception:
            pass
    hd(2, 4)
    d.save_screenshot("after-popup-dismiss.png")

    # --- CHERCHER ET BASCULER DANS L'IFRAME DE REDACTION ---
    review_iframe = None
    try:
        for iframe in d.find_elements(By.TAG_NAME, "iframe"):
            src = iframe.get_attribute("src") or ""
            if "WriteWidget" in src or "ReviewsService" in src or "write" in src.lower():
                review_iframe = iframe
                log("R", f"Found review iframe: {src[:120]}")
                break
        if review_iframe:
            d.switch_to.frame(review_iframe)
            log("R", "Switched to review iframe")
            hd(2, 3)
    except Exception as ie:
        log("R", f"Iframe handling error: {ie}")

    log("R", f"Selecting {rating} stars...")
    try:
        stars = d.find_elements(By.CSS_SELECTOR, 'div[role="radio"], span[role="img"], button[aria-label*="etoile"], button[aria-label*="star"]')
        if stars and len(stars) >= rating:
            star = stars[rating - 1]
            d.execute_script("arguments[0].scrollIntoView({block:'center'});", star)
            hd(0.5, 1)
            try:
                star.click()
            except Exception:
                ActionChains(d).move_to_element(star).click().perform()
            log("R", f"Clicked star {rating}")
        else:
            for btn in d.find_elements(By.CSS_SELECTOR, 'button, div[role="button"]'):
                label = btn.get_attribute("aria-label") or ""
                if "etoile" in label.lower() or "star" in label.lower():
                    d.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)
                    hd(0.3, 0.8)
                    try:
                        btn.click()
                    except Exception:
                        ActionChains(d).move_to_element(btn).click().perform()
                    log("R", f"Clicked star button: {label}")
                    break
    except Exception as e:
        log("R", f"Star selection issue: {e}")
    hd(3, 5)
    log("R", "Typing review...")
    review_typed = False

    def fill_input_robust(drv, el, txt):
        drv.execute_script("""
            var el=arguments[0], txt=arguments[1];
            el.focus(); el.click();
            var tag=el.tagName.toLowerCase(),
                ce=el.getAttribute&&el.getAttribute('contenteditable'),
                isCE=ce==='true'||ce==='plaintext-only';
            if(tag==='textarea'||tag==='input') el.value=txt;
            else if(isCE||tag==='div'||tag==='span') el.innerText=txt;
            else el.textContent=txt;
            var evts=['focus','click','keydown','keypress','keyup','beforeinput','input','change','blur'];
            evts.forEach(function(evt){
                var e=new Event(evt,{bubbles:true,cancelable:true});
                if(evt==='beforeinput') e.data=txt;
                el.dispatchEvent(e);
            });
            return true;
        """,el,txt)

    textarea_selectors = [
        "textarea[aria-label*='expérience']",
        "textarea[aria-label*='experience']",
        "textarea[placeholder*='expérience']",
        "textarea[placeholder*='experience']",
        "textarea[placeholder*='Partagez']",
        "textarea[placeholder*='Share']",
        "textarea",
        "div[contenteditable='true'][aria-label*='expérience']",
        "div[contenteditable='true'][aria-label*='experience']",
        "div[contenteditable='true'][aria-label*='Partagez']",
        "div[contenteditable='true'][aria-label*='Share']",
        "div[contenteditable='true']",
        "div[contenteditable='plaintext-only']",
        "[contenteditable='true']",
        "[contenteditable='plaintext-only']",
        "[role='textbox']",
        "form textarea",
        "[jsaction*='input'] textarea",
        "[jsaction*='input'] [contenteditable='true']",
        "[jsaction*='input'] [contenteditable='plaintext-only']",
        "input[aria-label*='expérience']",
        "input[aria-label*='experience']",
        "input[placeholder*='expérience']",
        "input[placeholder*='experience']",
        "input[placeholder*='Partagez']",
        "input[placeholder*='Share']"
    ]
    xpaths=[
        "//textarea[contains(@placeholder,'expérience') or contains(@placeholder,'experience') or contains(@placeholder,'Partagez') or contains(@placeholder,'Share') or contains(@aria-label,'expérience') or contains(@aria-label,'experience')]",
        "//div[contains(@aria-label,'expérience') or contains(@aria-label,'experience') or contains(@aria-label,'Partagez') or contains(@aria-label,'Share')]",
        "//div[@contenteditable='true']","//div[@contenteditable='plaintext-only']","//div[@role='textbox']",
        "//input[contains(@placeholder,'expérience') or contains(@placeholder,'experience')]"
    ]

    for attempt in range(8):
        if review_typed:
            break
        d.save_screenshot(f"before-textarea-attempt-{attempt}.png")
        # XPath first
        try:
            for xp in xpaths:
                for el in d.find_elements(By.XPATH,xp):
                    if el.is_displayed():
                        tag = el.tag_name.lower()
                        ce_val = el.get_attribute('contenteditable') or ''
                        is_ce = ce_val == 'true' or ce_val == 'plaintext-only'
                        is_textbox = el.get_attribute('role') == 'textbox'
                        if tag in ('textarea','input') or is_ce or is_textbox:
                            d.execute_script("arguments[0].scrollIntoView({block:'center'});",el)
                            hd(0.5,1)
                            fill_input_robust(d,el,review_text)
                            log("R",f"Review typed via XPath: {xp} (tag={tag}, ce={ce_val})")
                            review_typed=True; break
                        else:
                            log("R",f"XPath matched non-text element: {xp} (tag={tag})")
                if review_typed: break
        except Exception as e:
            pass

        # CSS selectors
        for sel in textarea_selectors:
            try:
                els=d.find_elements(By.CSS_SELECTOR,sel)
                for el in els:
                    if el.is_displayed() and el.is_enabled():
                        tag = el.tag_name.lower()
                        ce_val = el.get_attribute('contenteditable') or ''
                        is_ce = ce_val == 'true' or ce_val == 'plaintext-only'
                        is_textbox = el.get_attribute('role') == 'textbox'
                        if tag in ('textarea','input') or is_ce or is_textbox:
                            d.execute_script("arguments[0].scrollIntoView({block:'center'});",el)
                            hd(0.5,1)
                            fill_input_robust(d,el,review_text)
                            log("R",f"Review typed via selector: {sel} (tag={tag}, ce={ce_val})")
                            review_typed=True; break
                        else:
                            log("R",f"Selector matched non-text element: {sel} (tag={tag})")
                if review_typed: break
            except Exception as e:
                pass

        if not review_typed:
            # JS recursive search
            try:
                js_result = d.execute_script("""
                    function findEditable(node) {
                        if (!node) return null;
                        if (node.tagName === 'TEXTAREA') return node;
                        var ce=node.getAttribute&&node.getAttribute('contenteditable');
                        if (ce==='true'||ce==='plaintext-only') return node;
                        if (node.getAttribute && node.getAttribute('role') === 'textbox') return node;
                        for (let child of (node.children || [])) {
                            let found = findEditable(child);
                            if (found) return found;
                        }
                        if (node.shadowRoot) {
                            for (let child of (node.shadowRoot.children || [])) {
                                let found = findEditable(child);
                                if (found) return found;
                            }
                        }
                        return null;
                    }
                    let el = findEditable(document.body);
                    if (!el) return false;
                    el.focus(); el.click();
                    var tag=el.tagName.toLowerCase(),
                        ce=el.getAttribute&&el.getAttribute('contenteditable'),
                        isCE=ce==='true'||ce==='plaintext-only';
                    if (tag==='textarea'||tag==='input') el.value=arguments[0];
                    else if (isCE||tag==='div'||tag==='span') el.innerText=arguments[0];
                    else el.textContent=arguments[0];
                    var evts=['focus','click','keydown','keypress','keyup','beforeinput','input','change','blur'];
                    evts.forEach(function(evt){
                        var e=new Event(evt,{bubbles:true});
                        if(evt==='beforeinput') e.data=arguments[0];
                        el.dispatchEvent(e);
                    });
                    return true;
                """, review_text)
                if js_result:
                    log("R", "Review typed via JS recursive search")
                    review_typed = True
                    break
            except Exception as e:
                log("R", f"JS recursive search failed: {e}")

        if not review_typed:
            log("R", f"Attempt {attempt+1}: textarea not found yet, waiting...")
            hd(2, 3)

    if not review_typed:
        log("R", "All text area methods failed. Trying ActionChains keyboard simulation...")
        try:
            star_els = d.find_elements(By.CSS_SELECTOR, "button[aria-label*='étoile'], button[aria-label*='star'], img[aria-label*='étoile'], img[aria-label*='star']")
            if star_els:
                target = star_els[-1]
                d.execute_script("arguments[0].scrollIntoView({block:'center'});", target)
                hd(0.5, 1)
                actions = ActionChains(d)
                actions.click(target).pause(0.5).send_keys(Keys.TAB * 2).pause(0.5).send_keys(review_text).perform()
                log("R", "Review typed via ActionChains keyboard after star click")
                review_typed = True
        except Exception as ace:
            log("R", f"ActionChains fallback failed: {ace}")

    if not review_typed:
        log("R", "All text area methods failed. Running DOM diagnostic...")
        try:
            diag = d.execute_script("""
                var out = [];
                var all = document.querySelectorAll('textarea, [contenteditable], [role="textbox"], input, [data-focus-id], [jsaction*="input"]');
                for (var i=0; i < all.length; i++) {
                    var e = all[i];
                    var rect = e.getBoundingClientRect();
                    var vis = !!(rect.width && rect.height && window.getComputedStyle(e).display !== 'none' && window.getComputedStyle(e).visibility !== 'hidden');
                    out.push({
                        tag: e.tagName,
                        ce: e.getAttribute('contenteditable'),
                        role: e.getAttribute('role'),
                        aria: e.getAttribute('aria-label'),
                        placeholder: e.getAttribute('placeholder'),
                        cls: e.className,
                        id: e.id,
                        name: e.getAttribute('name'),
                        data_focus: e.getAttribute('data-focus-id'),
                        visible: vis,
                        rect: {x:rect.x, y:rect.y, w:rect.width, h:rect.height},
                        text: (e.value || e.innerText || e.textContent || '').substring(0,80)
                    });
                }
                return JSON.stringify(out);
            """)
            log("R", f"DOM editable elements: {diag}")
        except Exception as de:
            log("R", f"Diagnostic error: {de}")
        try:
            html_dump = d.execute_script("return document.documentElement.outerHTML;")
            with open("review-form-html-dump.html", "w", encoding="utf-8") as hf:
                hf.write(html_dump)
            log("R", "Saved full HTML to review-form-html-dump.html")
        except Exception as he:
            log("R", f"HTML dump error: {he}")
        d.save_screenshot("no-textarea.png")
        return False

    log("R", "Review typed successfully")
    hd(1, 2)
    d.save_screenshot("review-filled.png")

    # Vérification que le texte est réellement dans le champ
    try:
        text_in_field = d.execute_script("""
            var els = document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]');
            for (var i=0; i < els.length; i++) {
                var val = els[i].value || els[i].innerText || els[i].textContent || '';
                if (val.trim().length > 5) return val.trim().substring(0, 60);
            }
            return '';
        """)
        log("R", f"Field content check: '{text_in_field}...'")
        if len(text_in_field) < 5:
            log("R", "FAILURE! Field appears empty after typing.")
            d.save_screenshot("review-empty-field.png")
            return False
    except Exception as e:
        log("R", f"Could not verify field content: {e}")

    log("R", "Clicking Publish...")
    pub_texts = ["publier", "post", "publish", "envoyer", "submit", "publier l'avis", "poster"]
    published = click_by_text(d, pub_texts)

    # Fallback CSS selectors for publish button
    if not published:
        pub_selectors = [
            "button[aria-label*='publier']","button[aria-label*='Publier']","button[aria-label*='publish']",
            "button[aria-label*='envoyer']","button[data-item-id='send']","button[data-item-id='publish']",
            "div[role='button'][aria-label*='publish']","div[role='button'][aria-label*='publier']",
            "div[role='button'][aria-label*='Publier']","button[jsaction*='submit']","div[jsaction*='submit']"
        ]
        for sel in pub_selectors:
            try:
                for btn in d.find_elements(By.CSS_SELECTOR, sel):
                    if btn.is_displayed() and btn.is_enabled():
                        d.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)
                        hd(0.5, 1)
                        d.execute_script("arguments[0].click();", btn)
                        log("R", f"Clicked publish via selector: {sel}")
                        published = True; break
                if published: break
            except Exception as e:
                pass

    if published:
        hd(5, 8)
        d.save_screenshot("review-published.png")
        ps = d.page_source.lower()

        # VERY specific signals to avoid JS/CSS false positives
        success_signals = ["thank-you-title","merci pour votre avis","avis publié","avis a été publié","posted successfully","successfully posted","publié avec succès"]
        failure_signals = [
            "désactivées","règles n'autorisent",
            "try again","réessayer","votre avis n'a pas","not posted",
            "erreur s'est produite","échec","failed","impossible de publier"
        ]

        has_success = any(s in ps for s in success_signals)
        has_failure = any(f in ps for f in failure_signals)

        try:
            form_still_open = len(d.find_elements(By.CSS_SELECTOR, "textarea, [contenteditable='true'], [contenteditable='plaintext-only'], [role='textbox'], button[aria-label*='étoile'], button[aria-label*='star']")) > 0
        except Exception:
            form_still_open = False

        # Save page source for inspection
        try:
            with open("review-post-submit-page.html", "w", encoding="utf-8") as f:
                f.write(ps)
            log("R", "Saved post-submit page source to review-post-submit-page.html")
        except Exception:
            pass

        if has_success and not has_failure:
            log("R", "SUCCESS! Review appears published.")
            return True
        elif has_failure:
            log("R", "FAILURE! An error message appeared after submission.")
            if "désactivées" in ps or "règles n'autorisent" in ps:
                log("R", "GOOGLE BLOCK: 'Publications désactivées' or 'Rules do not allow' detected. Account may be limited or this place type is restricted.")
            d.save_screenshot("review-error-message.png")
            # Check if form is still open despite error signal
            if not form_still_open:
                log("R", "But form is closed - may be false positive. Checking again...")
                hd(3, 5)
                ps2 = d.page_source.lower()
                has_failure2 = any(f in ps2 for f in failure_signals)
                if not has_failure2:
                    log("R", "False positive cleared. Review likely published!")
                    return True
            return False
        elif form_still_open:
            log("R", "FAILURE! Review form is still open after clicking publish (likely empty/invalid/rejected).")
            d.save_screenshot("review-form-still-open.png")
            return False
        else:
            log("R", "Submitted but confirmation unclear. Check screenshot.")
            return True
    else:
        log("R", "Publish button not found.")
        d.save_screenshot("no-publish-btn.png")
        return False

def parse_args():
    p = argparse.ArgumentParser(description='Phase A+B - Login + Post Avis Google Maps')
    p.add_argument('--email', default='clientwebg2@gmail.com', help='Email Google')
    p.add_argument('--password', default='ClientGoogle2026.', help='Mot de passe Google')
    p.add_argument('--company', default='Boulangerie Dupont', help='Nom entreprise pour avis')
    p.add_argument('--category', default='boulangerie', help='Catégorie')
    p.add_argument('--rating', type=int, default=5, help='Note 1-5')
    p.add_argument('--no-input', action='store_true', help='Skip input() prompts (mode API)')
    p.add_argument('--profile-dir', default=r"C:\Users\Leo\cademo\uc_persistent_profile", help='Profil UC')
    p.add_argument('--cookies-file', default=r"C:\Users\Leo\cademo\phase_ab_cookies.json", help='Fichier cookies')
    return p.parse_args()

def main():
    global ARGS
    ARGS = parse_args()
    log("0", "PHASE A+B - Login + Post Review (Persistent Profile)")
    log("0", f"DEBUG - Email received: '{ARGS.email}'")
    log("0", f"DEBUG - Password length: {len(ARGS.password) if ARGS.password else 0}")
    # Log du mot de passe (masque) pour debug
    if ARGS.password:
        masked = ARGS.password[:2] + '*' * (len(ARGS.password) - 4) + ARGS.password[-2:] if len(ARGS.password) > 4 else '*' * len(ARGS.password)
        log("0", f"DEBUG - Password (masked): '{masked}'")
        log("0", f"DEBUG - Password chars: {list(ARGS.password)}")
    os.makedirs(ARGS.profile_dir, exist_ok=True)

    # Nettoyage du verrou Chrome si un ancien processus est planté
    for lockfile in ["SingletonLock", "SingletonCookie", "SingletonSocket"]:
        lf = os.path.join(ARGS.profile_dir, lockfile)
        if os.path.exists(lf):
            try:
                os.remove(lf)
                log("0", f"Removed stale lock: {lockfile}")
            except Exception:
                pass

    o = uc.ChromeOptions()
    o.add_argument(f"--user-data-dir={ARGS.profile_dir}")
    o.add_argument("--lang=fr-FR")
    o.add_argument("--window-size=1920,1080")
    o.add_argument("--disable-blink-features=AutomationControlled")
    o.add_argument("--no-sandbox")
    o.add_argument("--disable-dev-shm-usage")
    o.add_argument("--disable-gpu")
    d = None
    try:
        log("0", f"Launching UC with persistent profile: {ARGS.profile_dir}")
        # Forcer la version 151 (Chrome installé sur cette machine)
        d = uc.Chrome(options=o, version_main=151, use_subprocess=True)
        w = WebDriverWait(d, 15)
        connected = do_login(d, w)
        if not connected:
            log("Z", "LOGIN FAILED.")
            d.save_screenshot("login-failed-final.png")
            # Garder Chrome ouvert pour diagnostic sauf en mode API (--no-input)
            if not ARGS.no_input:
                print("\n" + "=" * 60)
                print("  [ECHEC] LOGIN FAILED")
                print("  Chrome reste OUVERT pour voir le probleme.")
                print("  Appuie sur ENTREE quand tu veux fermer.")
                print("=" * 60)
                input()
                try:
                    d.quit()
                except:
                    pass
                d = None
            return False
        log("3", "CONNECTED! Saving cookies...")
        d.get("https://myaccount.google.com")
        hd(3, 5)
        save_cookies(d, ARGS.cookies_file)
        d.save_screenshot("login-success.png")

        # Log explicite pour que le serveur détecte immédiatement le succès
        log("LOGIN", "SUCCESS")

        # DESACTIVE - Partie avis Google Maps désactivée pour le moment
        log("Z", "POST AVIS DESACTIVE - Bot s'arrete ici. Session active conservee.")
        
        # result = post_review(d, w, ARGS.company, ARGS.category, ARGS.rating)
        # if result:
        #     log("Z", "SUCCESS! Review posted. Profile saved for next time.")
        # else:
        #     log("Z", "Review posting failed. Profile saved.")

        # Mode interactif : on garde Chrome ouvert pour l'utilisateur/admin
        if not ARGS.no_input:
            print("\n" + "=" * 60)
            print("  [SUCCES] CONNEXION REUSSIE")
            print("  Chrome reste OUVERT. Tu peux utiliser le compte.")
            print("  Appuie sur ENTREE quand tu veux fermer le bot.")
            print("=" * 60)
            input()
            # Fermeture manuelle propre après l'utilisateur
            try:
                d.quit()
            except:
                pass
            d = None  # Évite que finally ne ferme une deuxième fois

        return True
    except Exception as e:
        log("X", f"CRITICAL: {e}")
        import traceback
        traceback.print_exc()
        if d:
            try:
                d.save_screenshot("critical-error.png")
            except:
                pass
        # Garder Chrome ouvert pour diagnostic si pas en mode API
        if not ARGS.no_input:
            print("\n" + "=" * 60)
            print("  [ERREUR] ERREUR CRITIQUE")
            print(f"  {e}")
            print("  Chrome reste OUVERT pour diagnostic.")
            print("  Appuie sur ENTREE quand tu veux fermer.")
            print("=" * 60)
            input()
            # Fermer proprement après l'utilisateur
            try:
                d.quit()
            except:
                pass
            d = None
        return False
    finally:
        # Ne fermer que si on est en mode API (--no-input) ou si d a déjà été mis à None
        if d and ARGS.no_input:
            try:
                d.quit()
            except Exception:
                pass

if __name__ == "__main__":
    main()
