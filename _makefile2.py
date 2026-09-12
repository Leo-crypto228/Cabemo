content = '''
def main():
    print("="*60)
    print("  TEST COMPLET - UNDETECTED + HUMAN + OLLAMA")
    print("="*60)

    options = uc.ChromeOptions()
    options.add_argument("--lang=fr-FR")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

    driver = uc.Chrome(options=options, version_main=151)
    wait = WebDriverWait(driver, 15)

    try:
        log("1", "Ouverture Google Accounts...")
        driver.get("https://accounts.google.com/signin/v2/identifier?continue=https%3A%2F%2Fmyaccount.google.com%2F")
        human_delay(3, 5)

        current = driver.current_url
        log("1", f"URL: {current}")
        if "signin/rejected" in current:
            log("1", "BLOQUE")
            return False

        log("2", "Page email - Remplissage...")
        email_input = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email'], input[name='identifier'], #identifierId")))
        human_type(email_input, EMAIL)
        log("2", "Email tape")

        human_delay(0.5, 2)
        email_input.send_keys(Keys.ENTER)
        log("2", "Email soumis")
        human_delay(4, 6)

        current = driver.current_url
        log("2", f"URL apres email: {current}")
        if "signin/rejected" in current:
            log("2", "BLOQUE APRES EMAIL")
            return False

        if "challenge/pwd" in current or "password" in current:
            log("3", "Page mot de passe")

            log("3", "Tentative: 'Mot de passe oublie'...")
            try:
                forgot = driver.find_element(By.XPATH, "//button[contains(.,'Mot de passe oublie')] | //a[contains(.,'Mot de passe oublie')] | //span[contains(.,'Mot de passe oublie')]/ancestor::button | //span[contains(.,'Forgot password')]/ancestor::button")
                human_delay(1, 3)
                forgot.click()
                log("3", "Clic 'Mot de passe oublie'")
                human_delay(5, 8)

                current = driver.current_url
                log("3", f"URL apres mdp oublie: {current}")
                page = driver.page_source
                if "Oui, c'est moi" in page or "c'est moi" in page.lower():
                    log("3", "PAGE 'Oui c est moi' DETECTEE !")
                    log("3", "Attente validation utilisateur (30s)...")
                    for i in range(30):
                        time.sleep(1)
                        current = driver.current_url
                        if "myaccount.google.com" in current.split("?")[0]:
                            log("3", "UTILISATEUR A VALIDE !")
                            break
                        if i % 5 == 0:
                            log("3", f"Attente... {i}s")
                    if "myaccount.google.com" not in current.split("?")[0]:
                        log("3", "Timeout")
                        return False
                else:
                    log("3", "Pas de Oui c est moi - screenshot")
                    driver.save_screenshot("uc-mdp-oublie.png")
                    return False
            except Exception as e:
                log("3", f"Mdp oublie non trouve: {e}")
                log("3", "Tentative VRAI mot de passe...")
                try:
                    pwd_input = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='password'], input[name='password'], input[name='Passwd']")))
                    human_type(pwd_input, REAL_PASSWORD)
                    log("3", "Mot de passe tape")
                    human_delay(0.5, 2)
                    pwd_input.send_keys(Keys.ENTER)
                    log("3", "Password soumis")
                    human_delay(4, 7)

                    current = driver.current_url
                    log("3", f"URL apres password: {current}")
                    if "myaccount.google.com" in current.split("?")[0]:
                        log("3", "CONNECTE AVEC VRAI MDP !")
                    elif "challenge" in current or "signin/v2/challenge" in current:
                        page = driver.page_source
                        if "Oui, c'est moi" in page or "c'est moi" in page.lower():
                            log("3", "PAGE 'Oui c est moi' !")
                            log("3", "Attente 30s...")
                            for i in range(30):
                                time.sleep(1)
                                if "myaccount.google.com" in driver.current_url.split("?")[0]:
                                    log("3", "UTILISATEUR A VALIDE !")
                                    break
                                if i % 5 == 0:
                                    log("3", f"Attente... {i}s")
                        else:
                            log("3", "Autre challenge")
                            driver.save_screenshot("uc-challenge.png")
                            return False
                    else:
                        log("3", "Password refuse")
                        driver.save_screenshot("uc-password-refused.png")
                        return False
                except Exception as e2:
                    log("3", f"Erreur password: {e2}")
                    return False
'''
with open("test-uc-full-auto.py", "a", encoding="utf-8") as f:
    f.write(content)
print("Part 2 done")
