"""PHASE A - UC Login + Cookies + Maps Test"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import time, random, requests, json, os

EMAIL = "clientwebg2@gmail.com"
REAL_PASSWORD = "ClientGoogle2026."
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2"
COOKIES_FILE = r"C:\Users\Leo\cademo\phase_a_cookies.json"

def hd(a=2, b=5):
    time.sleep(random.uniform(a, b))

def log(s, m):
    print(f"[{s}] {m}")

def ht(el, txt):
    for ch in txt:
        el.send_keys(ch)
        time.sleep(random.uniform(0.03, 0.25))
        if random.random() < 0.05:
            time.sleep(random.uniform(0.2, 0.8))
    hd(0.5, 1.5)

def save_cookies(driver, path):
    cookies = driver.get_cookies()
    with open(path, 'w') as f:
        json.dump(cookies, f, indent=2)
    log("CK", f"{len(cookies)} cookies saved to {path}")
    critical = ['SID', 'SSID', 'APISID', 'SAPISID', '__Secure-1PSID', '__Secure-3PSID']
    for c in cookies:
        if c['name'] in critical:
            log("CK", f"  {c['name']}: {c['value'][:30]}...")

def ollama(cmp, cat="restaurant", rt=5):
    p = f"Tu es un client francais. Avis Google {rt} etoiles pour '{cmp}' (cat:{cat}). 2-4 phrases naturel sans fautes. Texte seul."
    try:
        r = requests.post(OLLAMA_URL, json={"model": OLLAMA_MODEL, "prompt": p, "stream": False}, timeout=60)
        d = r.json()
        return d.get("response", d.get("text", "")).strip().strip('"')
    except Exception as e:
        log("OA", f"Ollama error: {e}")
        return None

def do_login(d, w):
    log("L", "=== LOGIN FLOW ===")
    d.get("https://accounts.google.com/signin/v2/identifier?continue=https%3A%2F%2Fmyaccount.google.com%2F")
    hd(3, 5)
    c = d.current_url
    log("L", f"URL after load: {c}")
    if "signin/rejected" in c:
        log("L", "BLOQUE - signin/rejected")
        return False

    # Email
    log("L", "Typing email...")
    try:
        e = w.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email'],input[name='identifier'],#identifierId")))
        ht(e, EMAIL)
        log("L", "Email typed -> ENTER")
        e.send_keys(Keys.ENTER)
        hd(4, 6)
    except Exception as ex:
        log("L", f"Email field error: {ex}")
        d.save_screenshot("email-err.png")
        return False

    c = d.current_url
    log("L", f"URL after email: {c}")
    if "signin/rejected" in c:
        log("L", "BLOQUE")
        return False

    # Password
    if "challenge/pwd" in c or "password" in c.lower() or "signin/v2/challenge" in c:
        log("L", "Password page detected")
        d.save_screenshot("pwd-page.png")
        try:
            p = w.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='password'],input[name='password'],input[name='Passwd'],#password input")))
            log("L", "Typing password...")
            ht(p, REAL_PASSWORD)
            log("L", "Password typed -> ENTER")
            p.send_keys(Keys.ENTER)
            hd(4, 7)
        except Exception as ex:
            log("L", f"Password field error: {ex}")
            d.save_screenshot("pwd-err.png")
            return False

    c = d.current_url
    log("L", f"URL after password: {c}")
    d.save_screenshot("after-password.png")
    ps = d.page_source

    # Direct success
    if "myaccount.google.com" in c.split("?")[0] and "signin" not in c.lower():
        log("L", "DIRECTLY CONNECTED!")
        return True

    # Notification "Oui c'est moi"
    if "Oui, c'est moi" in ps or "c'est moi" in ps.lower() or "Yes, it's me" in ps:
        log("L", "NOTIFICATION detected! Please click YES on your phone. Bot will wait 90s...")
        for i in range(90):
            time.sleep(1)
            c = d.current_url
            if "myaccount.google.com" in c.split("?")[0] and "signin" not in c.lower():
                log("L", f"USER APPROVED after {i}s")
                return True
            if i % 10 == 0:
                log("L", f"... still waiting ({i}s)")
        log("L", "TIMEOUT - user did not approve")
        return False

    # 2FA code
    if "code" in ps.lower() and ("2" in ps or "digit" in ps.lower() or "chiffre" in ps.lower()):
        log("L", "2FA/SMS code required - STOP")
        d.save_screenshot("2fa-required.png")
        return False

    # Captcha
    if "captcha" in ps.lower() or "recaptcha" in ps.lower():
        log("L", "CAPTCHA detected - need proxy or slower delays")
        d.save_screenshot("captcha.png")
        return False

    # Wrong password
    if "incorrect" in ps.lower() or "mot de passe incorrect" in ps.lower():
        log("L", "WRONG PASSWORD")
        return False

    log("L", f"Unknown state. URL={c}")
    d.save_screenshot("unknown.png")
    return False

def test_maps(d, w):
    log("M", "=== GOOGLE MAPS TEST ===")
    d.get("https://www.google.com/maps")
    hd(4, 6)
    try:
        s = w.until(EC.presence_of_element_located((By.ID, "searchboxinput")))
        log("M", "Typing search...")
        ht(s, "Boulangerie Dupont Orleans")
        s.send_keys(Keys.ENTER)
        hd(5, 8)
        log("M", "Search done")
    except Exception as ex:
        log("M", f"Search issue: {ex}")
    d.save_screenshot("maps-test-connected.png")
    log("M", "Screenshot: maps-test-connected.png")

def main():
    log("0", "PHASE A - UC Login + Cookies + Maps")
    o = uc.ChromeOptions()
    o.add_argument("--lang=fr-FR")
    o.add_argument("--window-size=1920,1080")
    o.add_argument("--disable-blink-features=AutomationControlled")

    d = None
    try:
        d = uc.Chrome(options=o, version_main=151)
        w = WebDriverWait(d, 15)

        connected = do_login(d, w)
        if connected:
            log("3", "CONNECTED! Saving cookies...")
            d.get("https://myaccount.google.com")
            hd(3, 5)
            save_cookies(d, COOKIES_FILE)
            d.save_screenshot("login-success.png")

            # Test Maps
            test_maps(d, w)

            # Generate review via Ollama
            log("5", "Generating review with Ollama...")
            av = ollama("Boulangerie Dupont", "boulangerie", 5)
            if av:
                log("5", f"Review: {av[:80]}...")
            else:
                log("5", "Ollama not available")

            log("Z", "SUCCESS! Phase A complete. Press ENTER to close...")
        else:
            log("Z", "FAILED to connect. Press ENTER to close...")

        input()
        return connected

    except Exception as e:
        log("X", f"CRITICAL: {e}")
        import traceback
        traceback.print_exc()
        if d:
            try:
                d.save_screenshot("critical-error.png")
            except:
                pass
        input()
        return False
    finally:
        if d:
            try:
                d.quit()
            except:
                pass
        log("Z", "Done.")

if __name__ == "__main__":
    r = main()
    print()
    print("=" * 60)
    if r:
        print("  SUCCESS!")
    else:
        print("  FAILED")
    print("=" * 60)

