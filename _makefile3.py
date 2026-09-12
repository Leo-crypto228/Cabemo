content = '''
        current = driver.current_url
        if "myaccount.google.com" in current.split("?")[0]:
            log("4", "="*50)
            log("4", "CONNEXION REUSSIE !")
            log("4", "="*50)
            cookies = driver.get_cookies()
            log("4", f"Cookies: {len(cookies)}")
            for c in cookies:
                if any(x in c["name"] for x in ["SID", "SSID", "APISID", "SAPISID", "__Secure-1PSID"]):
                    log("4", f"    {c['name']}: {c['value'][:30]}...")

            log("5", "Appel Ollama pour avis...")
            avis = ask_ollama("Boulangerie Dupont", "boulangerie", 5)
            if avis:
                log("5", f"Avis: {avis[:80]}...")
            else:
                avis = "Super experience ! Je recommande vivement."
                log("5", "Ollama KO - avis defaut")

            log("6", "Navigation Google Maps...")
            driver.get("https://www.google.com/maps")
            human_delay(3, 5)
            log("6", "Recherche entreprise...")
            search = wait.until(EC.presence_of_element_located((By.ID, "searchboxinput")))
            human_type(search, "Boulangerie Dupont")
            human_delay(0.5, 1)
            search.send_keys(Keys.ENTER)
            human_delay(4, 6)
            log("6", "Screenshot recherche")
            driver.save_screenshot("uc-maps-search.png")
            log("6", "Workflow complet - maps affiche")
            return True
        else:
            log("4", f"Non connecte: {current}")
            driver.save_screenshot("uc-not-connected.png")
            return False

    except Exception as e:
        log("X", f"ERREUR: {e}")
        try:
            driver.save_screenshot("uc-error.png")
        except:
            pass
        return False
    finally:
        log("Z", "Fermeture dans 3s...")
        human_delay(3, 3)
        driver.quit()
        log("Z", "Termine")
'''
with open("test-uc-full-auto.py", "a", encoding="utf-8") as f:
    f.write(content)
print("Part 3 done")
