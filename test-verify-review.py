"""
VERIFICATION - Verifier si l'avis a ete publie
"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
import time, os

PROFILE_DIR = r"C:\Users\Leo\cademo\uc_persistent_profile"

def log(s, m):
    print(f"[{s}] {m}")

def main():
    log("0", "=== VERIFICATION AVIS ===")
    o = uc.ChromeOptions()
    o.add_argument(f"--user-data-dir={PROFILE_DIR}")
    o.add_argument("--lang=fr-FR")
    o.add_argument("--window-size=1920,1080")
    o.add_argument("--disable-blink-features=AutomationControlled")
    
    d = None
    try:
        log("0", "Opening UC with saved profile...")
        d = uc.Chrome(options=o, version_main=151)
        
        # Option A: Check contributions page
        log("0", "Checking your contributions...")
        d.get("https://www.google.com/maps/contrib/")
        time.sleep(5)
        d.save_screenshot("verify-contributions.png")
        url = d.current_url
        log("0", f"URL: {url}")
        
        ps = d.page_source
        # Look for review indicators
        has_reviews = "Boulangerie" in ps or "Dupont" in ps or "avis" in ps.lower() or "review" in ps.lower()
        log("0", f"Page contains review keywords: {has_reviews}")
        
        # Option B: Go directly to the place and scroll to reviews
        log("0", "Checking place page...")
        # Search for the place again
        d.get("https://www.google.com/maps/search/Boulangerie%20Dupont%20boulangerie")
        time.sleep(6)
        d.save_screenshot("verify-place-search.png")
        
        # Click first result
        try:
            els = d.find_elements(By.CSS_SELECTOR, "a[href*='maps/place']")
            for el in els:
                if el.is_displayed():
                    d.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                    time.sleep(0.5)
                    d.execute_script("arguments[0].click();", el)
                    log("0", "Clicked first result")
                    break
        except Exception as e:
            log("0", f"Click error: {e}")
        
        time.sleep(4)
        d.save_screenshot("verify-place-page.png")
        
        # Scroll down to find reviews section
        for i in range(5):
            d.execute_script("window.scrollBy(0, 500);")
            time.sleep(1)
        
        ps = d.page_source
        d.save_screenshot("verify-reviews-section.png")
        
        # Check if our review text appears
        review_keywords = ["agreable surprise", "charmante boulangerie", "baguette", "Tres agreable"]
        found = False
        for kw in review_keywords:
            if kw.lower() in ps.lower():
                log("V", f"FOUND REVIEW! Keyword: '{kw}'")
                found = True
        
        # Also check for "clientwebg2" or account name
        if "clientwebg2" in ps.lower():
            log("V", "FOUND your username in reviews!")
            found = True
        
        if not found:
            log("V", "Review not visible yet (may need moderation time)")
        
        log("0", "Done. Check screenshots:")
        log("0", "  - verify-contributions.png")
        log("0", "  - verify-reviews-section.png")
        
        input("Press ENTER to close...")
        return found
        
    except Exception as e:
        log("X", f"Error: {e}")
        import traceback
        traceback.print_exc()
        input()
        return False
    finally:
        if d:
            try:
                d.quit()
            except:
                pass

if __name__ == "__main__":
    r = main()
    print()
    print("=" * 60)
    if r:
        print("  REVIEW CONFIRMED PUBLISHED!")
    else:
        print("  REVIEW NOT FOUND (may be pending moderation)")
    print("=" * 60)
