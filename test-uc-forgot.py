"""Test 'Mot de passe oublie' uniquement"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import time,random

def hd(a=2,b=5):time.sleep(random.uniform(a,b))
EMAIL="clientwebg2@gmail.com"

print("="*60);print("TEST MOT DE PASSE OUBLIE");print("="*60)
o=uc.ChromeOptions()
o.add_argument("--lang=fr-FR");o.add_argument("--window-size=1920,1080")
o.add_argument("--disable-blink-features=AutomationControlled")
d=uc.Chrome(options=o,version_main=151)
w=WebDriverWait(d,15)
try:
 print("[1] Open...")
 d.get("https://accounts.google.com/signin/v2/identifier?continue=https%3A%2F%2Fmyaccount.google.com%2F")
 hd(3,5);print(f"[1] URL:{d.current_url}")
 print("[2] Email...")
 e=w.until(EC.presence_of_element_located((By.CSS_SELECTOR,"input[type='email'],input[name='identifier'],#identifierId")))
 e.send_keys(EMAIL);hd(1,2);e.send_keys(Keys.ENTER);print("[2] Submitted");hd(4,6)
 print(f"[2] URL:{d.current_url}")
 print("[3] Pwd page - Screenshot...");d.save_screenshot("forgot-pwd.png")
 print("[3] Click 'Mot de passe oublie'...")
 try:
  f=d.find_element(By.XPATH,"//a[contains(text(),'Mot de passe oublie')] | //button[contains(text(),'Mot de passe oublie')] | //span[contains(text(),'Mot de passe oublie')]/ancestor::button | //div[contains(text(),'Mot de passe oublie')]/ancestor::button | //*[contains(text(),'Mot de passe oublie') and (self::a or self::button)]")
  f.click();print("[3] Clicked (XPath text)");hd(5,8)
 except Exception as ex1:
  print(f"[3] XPath fail:{ex1}")
  try:
   f=d.find_element(By.XPATH,"//a[@href*='forgot'] | //a[@href*='recovery'] | //a[@href*='password']")
   f.click();print("[3] Clicked (href)");hd(5,8)
  except Exception as ex2:
   print(f"[3] href fail:{ex2}")
   try:
    btns=d.find_elements(By.TAG_NAME,"a")
    for b in btns:
     t=b.text.lower()
     if 'oublie' in t or 'forgot' in t or 'password' in t:
      b.click();print(f"[3] Clicked via text scan:'{b.text}'");hd(5,8);break
   except Exception as ex3:print(f"[3] All fail:{ex3}");d.save_screenshot("forgot-fail.png")
 c=d.current_url;print(f"[3] URL after click:{c}")
 d.save_screenshot("forgot-after.png")
 ps=d.page_source
 if "Oui, c'est moi" in ps or "c'est moi" in ps.lower():
  print("[3] 'Oui c est moi' detected! Waiting 30s...")
  for i in range(30):
   time.sleep(1);c=d.current_url
   if "myaccount.google.com" in c.split("?")[0]:print("[3] CONNECTED!");break
   if i%5==0:print(f"[3] ...{i}s")
 elif "code" in ps.lower() or "verification" in ps.lower():
  print("[3] Verification code page - need email access")
  d.save_screenshot("forgot-code.png")
 else:
  print("[3] Unknown page")
  d.save_screenshot("forgot-unknown.png")
 print(f"[4] Final URL:{d.current_url}")
except Exception as e:print(f"[X] ERR:{e}");d.save_screenshot("forgot-err.png")
finally:print("[Z] Close");hd(5,5);d.quit()
