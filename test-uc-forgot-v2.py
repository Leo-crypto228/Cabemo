"""Test 'Mot de passe oublie' - scan universel des liens"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import time,random

def hd(a=2,b=5):time.sleep(random.uniform(a,b))
EMAIL="clientwebg2@gmail.com"

print("="*60);print("TEST FORGOT PASSWORD v2 - SCAN UNIVERSEL");print("="*60)
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
 print("[3] Pwd page - scan ALL links for 'oublie' or 'forgot'...")
 d.save_screenshot("forgotv2-pwd.png")

 # Methode 1: tous les <a>
 links=d.find_elements(By.TAG_NAME,"a")
 print(f"[3] Found {len(links)} <a> tags")
 found=None
 for i,lk in enumerate(links):
  txt=lk.text.strip().lower()
  if 'oublie' in txt or 'forgot' in txt:
   print(f"[3] FOUND link #{i}: '{lk.text}'")
   found=lk;break
 if not found:
  print("[3] Not in <a>, trying <button>...")
  btns=d.find_elements(By.TAG_NAME,"button")
  print(f"[3] Found {len(btns)} <button> tags")
  for i,b in enumerate(btns):
   txt=b.text.strip().lower()
   if 'oublie' in txt or 'forgot' in txt:
    print(f"[3] FOUND button #{i}: '{b.text}'")
    found=b;break
 if not found:
  print("[3] Not in <button>, trying <span> parents...")
  spans=d.find_elements(By.TAG_NAME,"span")
  for i,s in enumerate(spans):
   txt=s.text.strip().lower()
   if 'oublie' in txt or 'forgot' in txt:
    print(f"[3] FOUND span #{i}: '{s.text}'")
    try:
     parent=s.find_element(By.XPATH,"..")
     print(f"[3] Parent tag: {parent.tag_name}")
     found=parent;break
    except:pass
 if found:
  print("[3] Clicking...")
  try:
   d.execute_script("arguments[0].scrollIntoView(true);",found)
   hd(0.5,1)
   found.click();print("[3] Clicked!")
  except Exception as ce:
   print(f"[3] Click fail, trying JS click:{ce}")
   d.execute_script("arguments[0].click();",found);print("[3] JS clicked!")
  hd(5,8)
  c=d.current_url;print(f"[3] URL after click:{c}")
  d.save_screenshot("forgotv2-after.png")
  ps=d.page_source
  if "Oui, c'est moi" in ps or "c'est moi" in ps.lower():
   print("[3] 'Oui c est moi'! Wait 30s...")
   for i in range(30):
    time.sleep(1);c=d.current_url
    if "myaccount.google.com" in c.split("?")[0]:print("[3] CONNECTED!");break
    if i%5==0:print(f"[3] ...{i}s")
  elif "code" in ps.lower() or "verification" in ps.lower():
   print("[3] Code verification page");d.save_screenshot("forgotv2-code.png")
  else:
   print("[3] Unknown page");d.save_screenshot("forgotv2-unknown.png")
 else:
  print("[3] NOT FOUND anywhere!")
  # Dump all visible text
  all_text=d.find_element(By.TAG_NAME,"body").text
  print("[3] Page text (first 500 chars):")
  print(all_text[:500])
 print(f"[4] Final URL:{d.current_url}")
except Exception as e:print(f"[X] ERR:{e}");d.save_screenshot("forgotv2-err.png")
finally:print("[Z] Close");hd(5,5);d.quit()
