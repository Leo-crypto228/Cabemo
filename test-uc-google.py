"""
Test undetected-chromedriver sur Google Login
"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

print("="*50)
print("  TEST UNDETECTED-CHROMEDRIVER - GOOGLE LOGIN")
print("="*50)

options = uc.ChromeOptions()
options.add_argument("--lang=fr-FR")
options.add_argument("--window-size=1920,1080")
options.add_argument("--disable-blink-features=AutomationControlled")

driver = uc.Chrome(options=options, version_main=151)

try:
    print("\n[+] Ouverture de Google Accounts...")
    driver.get("https://accounts.google.com/signin/v2/identifier?continue=https%3A%2F%2Fmyaccount.google.com%2F")
    time.sleep(3)
    
    current_url = driver.current_url
    print(f"[+] URL actuelle: {current_url}")
    
    if "signin/rejected" in current_url:
        print("[-] BLOQUE: signin/rejected")
        driver.save_screenshot("uc-rejected.png")
        print("[-] Screenshot: uc-rejected.png")
    else:
        print("[+] Page email chargee sans blocage!")
        
        # Email
        print("[+] Remplissage email...")
        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email'], input[name='identifier'], #identifierId"))
        )
        email_input.send_keys("clientwebg2@gmail.com")
        time.sleep(1)
        
        # Submit (Enter ou clic bouton Suivant)
        from selenium.webdriver.common.keys import Keys
        email_input.send_keys(Keys.ENTER)
        print("[+] Email soumis")
        time.sleep(4)
        
        url_after_email = driver.current_url
        print(f"[+] URL apres email: {url_after_email}")
        
        if "signin/rejected" in url_after_email:
            print("[-] BLOQUE APRES EMAIL")
            driver.save_screenshot("uc-rejected2.png")
        elif "password" in url_after_email or "challenge" in url_after_email:
            print("[+] ETAPE PASSWORD ATTEINTE!")
            print("[+] TENTATIVE MOT DE PASSE...")
            
            password_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='password'], input[name='password'], input[name='Passwd']"))
            )
            password_input.send_keys("Cadeau974")
            time.sleep(1)
            password_input.send_keys(Keys.ENTER)
            print("[+] Password soumis (Enter)")
            time.sleep(3)
            
            # Si toujours sur challenge/pwd, essayer de cliquer le bouton Suivant
            current = driver.current_url
            if "challenge/pwd" in current or "signin/v2/challenge" in current:
                print("[+] Encore sur page password, tentative clic bouton Suivant...")
                try:
                    suivant = WebDriverWait(driver, 5).until(
                        EC.element_to_be_clickable((By.XPATH, "//button[.//span[contains(text(),'Suivant')]] | //button[@type='submit'] | //span[contains(text(),'Suivant')]/ancestor::button"))
                    )
                    suivant.click()
                    print("[+] Bouton Suivant clique")
                    time.sleep(5)
                except:
                    print("[-] Bouton Suivant non trouve")
                    driver.save_screenshot("uc-password-page.png")
            
            final_url = driver.current_url
            print(f"[+] URL FINALE: {final_url}")
            
            # Screenshot pour diagnostic
            driver.save_screenshot("uc-diagnostic.png")
            print("[+] Screenshot: uc-diagnostic.png")
            
            # Verifier contenu page
            page_html = driver.page_source.lower()
            if "mot de passe incorrect" in page_html or "password is incorrect" in page_html or "wrong password" in page_html:
                print("[-] MOT DE PASSE INCORRECT")
            elif "captcha" in page_html or "recaptcha" in page_html:
                print("[-] CAPTCHA DETECTE")
            elif "too many" in page_html or "rate limit" in page_html or "temporarily" in page_html:
                print("[-] RATE LIMITING - Trop de tentatives")
            
            # Verification reelle (pas le param continue dans l URL)
            parsed = final_url.split('?')[0]
            is_connected = "myaccount.google.com" in parsed or "mail.google.com" in parsed
            is_password_page = "challenge/pwd" in final_url or "signin/challenge" in final_url
            is_rejected = "signin/rejected" in final_url
            
            if is_connected:
                print("\n" + "="*50)
                print("  ✅✅✅ CONNEXION REUSSIE ! ✅✅✅")
                print("="*50)
                
                # Recuperation cookies
                cookies = driver.get_cookies()
                print(f"\n[+] Cookies recuperees: {len(cookies)}")
                for c in cookies:
                    if any(x in c['name'] for x in ['SID', 'SSID', 'APISID', 'SAPISID', '__Secure-1PSID']):
                        print(f"    {c['name']}: {c['value'][:20]}...")
                        
            elif is_rejected:
                print("[-] BLOQUE PAR GOOGLE (signin/rejected)")
                
            elif is_password_page:
                print("[+] TOUJOURS SUR PAGE PASSWORD")
                print("[+] Google n a pas accepte le password")
                print("[+] Possibles: mdp incorrect / captcha / rate limit / 2FA")
                
            elif "challenge" in final_url or "two" in final_url:
                print("[+] CHALLENGE/2FA - Compte valide mais verification necessaire")
                print(f"[+] URL: {final_url}")
                # On check si c'est "Oui, c'est moi" 
                page_source = driver.page_source
                if "Oui, c'est moi" in page_source or "c'est moi" in page_source.lower():
                    print("[+] PAGE 'Oui, c'est moi' DETECTEE !")
                    # Essayer de cliquer
                    try:
                        oui_btn = driver.find_element(By.XPATH, "//button[contains(.,\"Oui, c'est moi\")] | //span[contains(.,\"Oui, c'est moi\")]/ancestor::button")
                        oui_btn.click()
                        print("[+] Bouton 'Oui, c'est moi' clique!")
                        time.sleep(5)
                        post_url = driver.current_url
                        if "myaccount.google.com" in post_url.split('?')[0]:
                            print("\n" + "="*50)
                            print("  ✅✅✅ CONNEXION COMPLETE AVEC OUI C'EST MOI ! ✅✅✅")
                            print("="*50)
                    except Exception as e2:
                        print(f"[-] Impossible de cliquer 'Oui c est moi': {e2}")
            else:
                print("[-] Resultat inconnu")
                driver.save_screenshot("uc-final.png")
        else:
            print("[-] Transition inattendue apres email")
            driver.save_screenshot("uc-unexpected.png")

except Exception as e:
    print(f"\n[-] ERREUR: {e}")
    driver.save_screenshot("uc-error.png")
    
finally:
    print("\n[+] Fermeture dans 5s...")
    time.sleep(5)
    driver.quit()
    print("[+] Termine")