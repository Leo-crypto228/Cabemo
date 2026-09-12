import undetected_chromedriver as uc
import os, time, json

PERSISTENT_PROFILE = r"C:\Users\Leo\cademo\uc_persistent_profile"
COOKIES_FILE = r"C:\Users\Leo\cademo\google_cookies.json"

def save_cookies(driver, path):
    cookies = driver.get_cookies()
    with open(path, 'w') as f:
        json.dump(cookies, f)
    print(f"[✓] {len(cookies)} cookies saved to {path}")

def load_cookies(driver, path):
    if not os.path.exists(path):
        print("[!] No cookies file found")
        return False
    with open(path, 'r') as f:
        cookies = json.load(f)
    for cookie in cookies:
        try:
            # Filter out problem keys
            cookie.pop('sameSite', None)
            cookie.pop('storeId', None)
            if 'domain' not in cookie or not cookie['domain'].startswith('.'):
                cookie['domain'] = '.google.com'
            driver.add_cookie(cookie)
        except Exception as e:
            pass
    print(f"[✓] Loaded {len(cookies)} cookies")
    return True

if __name__ == "__main__":
    print("="*60)
    print("TEST UC - PERSISTENT PROFILE + COOKIES")
    print("="*60)
    
    os.makedirs(PERSISTENT_PROFILE, exist_ok=True)
    
    options = uc.ChromeOptions()
    options.add_argument(f"--user-data-dir={PERSISTENT_PROFILE}")
    
    driver = uc.Chrome(options=options, version_main=None)
    
    try:
        # First, try cookies injection
        print("[1] Going to google.com to set domain...")
        driver.get("https://www.google.com")
        time.sleep(2)
        
        if os.path.exists(COOKIES_FILE):
            print("[2] Loading previous cookies...")
            load_cookies(driver, COOKIES_FILE)
            driver.get("https://myaccount.google.com")
            time.sleep(5)
            url = driver.current_url
            if "signin" not in url.lower():
                print("[✓✓✓] Reconnected via cookies!")
                driver.save_screenshot("persistent-connected.png")
                input("Press ENTER to close...")
                driver.quit()
                exit(0)
            else:
                print("[!] Cookies expired or invalid, need full login")
        
        # Full login flow (one-time setup)
        print("[2] No valid cookies. Running full login (ONE TIME SETUP)...")
        driver.get("https://accounts.google.com/v3/signin/identifier?continue=https://myaccount.google.com/&flowName=GlifWebSignIn")
        time.sleep(3)
        
        print("[3] Page loaded. You must complete login manually in the browser:")
        print("    - Enter email")
        print("    - Click 'Forgot password' if needed")
        print("    - Approve on phone (Yes it's me)")
        print("    - Enter the 2-digit code shown on screen")
        print("    - Complete any remaining steps")
        print("[3] Once you see 'myaccount.google.com', press ENTER here to save cookies.")
        input("[?] Press ENTER when connected...")
        
        url = driver.current_url
        if "myaccount.google.com" in url or "signin" not in url.lower():
            save_cookies(driver, COOKIES_FILE)
            print("[✓✓✓] Setup complete! Next runs will auto-connect.")
        else:
            print("[!] Still on signin page. Login may have failed.")
            
        driver.save_screenshot("persistent-setup.png")
        input("Press ENTER to close...")
        
    except Exception as e:
        print(f"[X] Error: {e}")
        import traceback
        traceback.print_exc()
        input("Press ENTER to close...")
    finally:
        try:
            driver.quit()
        except:
            pass
