import undetected_chromedriver as uc
import shutil, os, time, subprocess

PROFILE_SRC = r"C:\Users\Leo\AppData\Local\Google\Chrome\User Data"
PROFILE_DST = r"C:\Users\Leo\cademo\uc_imported_profile"

def kill_chrome():
    try:
        subprocess.run(['taskkill','/F','/IM','chrome.exe','/T'], capture_output=True)
        print("[K] Chrome processes killed")
        time.sleep(2)
    except Exception as e:
        print(f"[K] No Chrome to kill: {e}")

def robust_copy(src, dst):
    if os.path.exists(dst):
        print("[i] Removing old copy...")
        shutil.rmtree(dst, ignore_errors=True)
        time.sleep(1)
    print(f"[i] Copying profile from {src}...")
    try:
        shutil.copytree(src, dst, ignore=shutil.ignore_patterns('lock','chrome_shutdown_ms.txt','*.tmp','DevTools*'))
        print("[V] Profile copied!")
    except Exception as e:
        print(f"[!] Copy error (some files locked): {e}")
        print("[i] Fallback: copying only essential dirs...")
        os.makedirs(dst, exist_ok=True)
        for item in ['Default','Local State','ShaderCache']:
            s = os.path.join(src, item)
            d = os.path.join(dst, item)
            if os.path.exists(s):
                try:
                    if os.path.isdir(s):
                        if os.path.exists(d):
                            shutil.rmtree(d, ignore_errors=True)
                            time.sleep(0.5)
                        shutil.copytree(s, d, ignore=shutil.ignore_patterns('lock','*.tmp'))
                    else:
                        shutil.copy2(s, d)
                except Exception as ex:
                    print(f"[!] Could not copy {item}: {ex}")
        print("[V] Partial copy done!")

if __name__ == "__main__":
    print("="*60)
    print("TEST UC - IMPORT CHROME PROFILE")
    print("="*60)
    kill_chrome()
    robust_copy(PROFILE_SRC, PROFILE_DST)
    print("[1] Launching UC with Chrome v151...")
    options = uc.ChromeOptions()
    options.add_argument(f"--user-data-dir={PROFILE_DST}")
    options.add_argument("--lang=fr-FR")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    driver = None
    try:
        driver = uc.Chrome(options=options, version_main=151)
        print("[2] Going to myaccount.google.com...")
        driver.get("https://myaccount.google.com")
        time.sleep(5)
        url = driver.current_url
        print(f"[2] URL: {url}")
        if "myaccount.google.com" in url and "signin" not in url.lower():
            print("[V] CONNECTED via imported profile!")
        elif "signin" in url.lower():
            print("[!] Still on signin - need full login (run test-uc-phase-a.py)")
        else:
            print(f"[?] Unknown state")
        driver.save_screenshot("import-result.png")
        input("[?] Press ENTER to close...")
    except Exception as e:
        print(f"[X] Error: {e}")
        import traceback
        traceback.print_exc()
        input()
    finally:
        if driver:
            try: driver.quit()
            except: pass
        print("[Z] Done.")

