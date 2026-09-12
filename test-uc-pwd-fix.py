"""Test password avec clic + send_keys d'un coup + clic Suivant"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
import time,random

def hd(a=2,b=5):time.sleep(random.uniform(a,b))
EMAIL="clientwebg2@gmail.com"
REAL_PASSWORD="ClientGoogle2026."

print("="*60);print("TEST PASSWORD FIX");print("="*60)
o=uc.ChromeOptions()
o.add_argument("--lang=fr-FR");o.add_argument("--window-size=1920,1080")
o.add_argument("--disable-blink-features=AutomationControlled")
d=uc.Chrome(options=o,version_main=151)
w=WebDriverWait(d,15)
try:
 print("[1] Open Google...")
 d.get("https://accounts.google.com/signin/v2/identifier?continue=https%3A%2F%2Fmyaccount.google.com%2F")
 hd(3,5)
 c=d.current_url;print(f"[1] URL:{c}")
 if "signin/rejected" in c:print("[1] BLOQUE");exit()
 print("[2] Email...")
 e=w.until(EC.presence_of_element_located((By.CSS_SELECTOR,"input[type='email'],input[name='identifier'],#identifierId")))
 e.send_keys(EMAIL);print("[2] Email done");hd(1,2)
 e.send_keys(Keys.ENTER);print("[2] Submitted");hd(4,6)
 c=d.current_url;print(f"[2] URL:{c}")
 if "challenge/pwd" in c or "password" in c:
  print("[3] Password page! Screenshot...")
  d.save_screenshot("fix-pwd-page.png")
  print("[3] Finding password input...")
  p=w.until(EC.presence_of_element_located((By.CSS_SELECTOR,"input[type='password'],input[name='password'],input[name='Passwd']")))
  print("[3] Clicking password field...")
  p.click();hd(0.5,1)
  print("[3] Typing password (all at once)...")
  p.send_keys(REAL_PASSWORD);print("[3] Password entered");hd(1,2)
  d.save_screenshot("fix-pwd-typed.png")
  print("[3] Clicking Suivant...")
  try:
   btn=d.find_element(By.XPATH,"//button[.//span[contains(text(),'Suivant')]] | //span[contains(text(),'Suivant')]/ancestor::button | //button[@type='submit']")
   btn.click();print("[3] Suivant clicked");hd(5,8)
  except Exception as bx:
   print(f"[3] No Suivant button: {bx}")
   p.send_keys(Keys.ENTER);print("[3] Enter pressed");hd(5,8)
  c=d.current_url;print(f"[3] URL after:{c}")
  d.save_screenshot("fix-after-submit.png")
  ps=d.page_source.lower()
  if "mot de passe incorrect" in ps or "wrong password" in ps:print("[3] WRONG PASSWORD");d.save_screenshot("fix-wrong.png")
  elif "captcha" in ps or "recaptcha" in ps:print("[3] CAPTCHA");d.save_screenshot("fix-captcha.png")
  elif "myaccount.google.com" in c.split("?")[0]:print("[3] CONNECTED!");d.save_screenshot("fix-connected.png")
  else:print("[3] UNKNOWN");d.save_screenshot("fix-unknown.png")
 else:print("[2] Not on pwd page")
except Exception as ex:print(f"[X] ERR:{ex}");d.save_screenshot("fix-error.png")
finally:print("[Z] Closing...");hd(5,5);d.quit();print("[Z] Done")
