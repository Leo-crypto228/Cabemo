"""
PHASE B - Poster un avis Google Maps avec cookies sauvegardes
Prerequis: Avoir lance test-uc-phase-a.py et avoir phase_a_cookies.json
"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import time, random, json, requests, os

COOKIES_FILE = r"C:\Users\Leo\cademo\phase_a_cookies.json"
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2"

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

def load_and_apply_cookies(driver, path):
    with open(path, 'r') as f:
        cookies = json.load(f)
    log("CK", f"Loading {len(cookies)} cookies...")
    driver.get("https://www.google.com")
    hd(2, 3)
    ok = 0
    for c in cookies:
        try:
            cookie = {
                "name": c["name"],
                "value": c["value"],
                "domain": c.get("domain", ".google.com"),
                "path": c.get("path", "/"),
                "secure": c.get("secure", True),
                "httpOnly": c.get("httpOnly", False),
            }
            if "expiry" in c:
                cookie["expiry"] = c["expiry"]
            driver.add_cookie(cookie)
            ok += 1
        except Exception as e:
            pass
    log("CK", f"{ok}/{len(cookies)} cookies applied")
    return ok

def ollama(cmp, cat="restaurant", rt=5):
    p = f"Tu es un client francais. Avis Google {rt} etoiles pour '{cmp}' (cat:{cat}). 2-4 phrases naturel sans fautes. Texte seul."
    try:
        r = requests.post(OLLAMA_URL, json={"model": OLLAMA_MODEL, "prompt": p, "stream": False}, timeout=60)
        d = r.json()
        return d.get("response", d.get("text", "")).strip().strip('"')
    except Exception as e:
        log("OA", f"Ollama error: {e}")
        return None

def click_by_text(driver, texts):
    for t in texts:
        try:
            xpath = f"//*[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'{t.lower()}')]"
            els = driver.find_elements(By.XPATH, xpath)
            for el in els:
                if el.is_displayed() and el.is_enabled():
                    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                    hd(0.5, 1)
                    driver.execute_script("arguments[0].click();", el)
                    log("CL", f"Clicked '{t}'")
                    return True
        except Exception as e:
            pass
    return False

def post_review(driver, wait, company, category, rating=5):
    log("R", "=== POST REVIEW ===")
    
    log("R", "Generating review with Ollama...")
    review_text = ollama(company, category, rating)
    if not review_text:
        review_text = f"Tres satisfait de {company}. Service excellent et rapide. Je recommande vivement !"
    log("R", f"Review: {review_text[:80]}...")

    search_q = f"{company} {category}"
    maps_url = f"https://www.google.com/maps/search/{requests.utils.quote(search_q)}"
    log("R", f"Opening Maps: {maps_url}")
    driver.get(maps_url)
    hd(5, 8)
    driver.save_screenshot("maps-search.png")

    log("R", "Looking for 'Write a review' button...")
    review_btn_texts = [
        "ecrire un avis", "write a review", "add a review",
        "votre avis", "donner un avis", "avis", "review"
    ]
    
    clicked = False
    for attempt in range(3):
        clicked = click_by_text(driver, review_btn_texts)
        if clicked:
            break
        hd(2, 3)
        driver.save_screenshot(f"maps-attempt-{attempt}.png")
    
    if not clicked:
        log("R", "Could not find review button. Check screenshots.")
        driver.save_screenshot("no-review-btn.png")
        return False
    
    hd(3, 5)
    driver.save_screenshot("review-form-open.png")
    
    log("R", f"Selecting {rating} stars...")
    try:
        stars = driver.find_elements(By.CSS_SELECTOR, 'div[role="radio"], span[role="img"], button[aria-label*="etoile"], button[aria-label*="star"]')
        if stars and len(stars) >= rating:
            star = stars[rating - 1]
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", star)
            hd(0.5, 1)
            driver.execute_script("arguments[0].click();", star)
            log("R", f"Clicked star {rating}")
        else:
            for btn in driver.find_elements(By.CSS_SELECTOR, 'button, div[role="button"]'):
                label = btn.get_attribute("aria-label") or ""
                if "etoile" in label.lower() or "star" in label.lower():
                    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)
                    hd(0.3, 0.8)
                    driver.execute_script("arguments[0].click();", btn)
                    log("R", f"Clicked star button: {label}")
                    break
    except Exception as e:
        log("R", f"Star selection issue: {e}")
    
    hd(1, 2)
    
    log("R", "Typing review...")
    try:
        txt_el = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "textarea, div[role='textbox']")))
        ht(txt_el, review_text)
        log("R", "Review typed")
    except Exception as e:
        log("R", f"Text area not found: {e}")
        driver.save_screenshot("no-textarea.png")
        return False
    
    hd(1, 2)
    driver.save_screenshot("review-filled.png")
    
    log("R", "Clicking Publish...")
    pub_texts = ["publier", "post", "publish", "envoyer", "submit"]
    published = click_by_text(driver, pub_texts)
    
    if published:
        hd(4, 6)
        driver.save_screenshot("review-published.png")
        ps = driver.page_source.lower()
        if "merci" in ps or "publie" in ps or "posted" in ps or "thank" in ps:
            log("R", "SUCCESS! Review appears published.")
            return True
        else:
            log("R", "Submitted but confirmation unclear. Check screenshot.")
            return True
    else:
        log("R", "Publish button not found.")
        driver.save_screenshot("no-publish-btn.png")
        return False

def main():
    log("0", "PHASE B - Post Review with Saved Cookies")
    
    if not os.path.exists(COOKIES_FILE):
        log("X", f"Cookies file not found: {COOKIES_FILE}")
        log("X", "Run test-uc-phase-a.py first!")
        return False
    
    o = uc.ChromeOptions()
    o.add_argument("--lang=fr-FR")
    o.add_argument("--window-size=1920,1080")
    o.add_argument("--disable-blink-features=AutomationControlled")
    
    d = None
    try:
        d = uc.Chrome(options=o, version_main=151)
        w = WebDriverWait(d, 15)
        
        load_and_apply_cookies(d, COOKIES_FILE)
        
        log("0", "Verifying connection...")
        d.get("https://myaccount.google.com")
        hd(4, 6)
        url = d.current_url
        log("0", f"URL after cookie load: {url}")
        
        if "signin" in url.lower():
            log("X", "Cookies expired or invalid. Need to re-run Phase A.")
            d.save_screenshot("cookie-fail.png")
            input("Press ENTER to close...")
            return False
        
        log("0", "Cookies valid! Connected.")
        d.save_screenshot("cookie-success.png")
        
        result = post_review(d, w, "Boulangerie Dupont", "boulangerie", 5)
        
        if result:
            log("Z", "SUCCESS! Review posted. Press ENTER to close...")
        else:
            log("Z", "Review posting failed. Press ENTER to close...")
        
        input()
        return result
        
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
        print("  REVIEW POSTED SUCCESSFULLY!")
    else:
        print("  FAILED")
    print("=" * 60)

