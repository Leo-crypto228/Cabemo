"""Test 'Mot de passe oublie' - JS scanner ALL elements"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import time,random

def hd(a=2,b=5):time.sleep(random.uniform(a,b))
EMAIL="clientwebg2@gmail.com"

print("="*60);print("TEST FORGOT v3 - JS UNIVERSAL SCANNER");print("="*60)
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
 print("[3] Pwd page - JS scan ALL elements for 'oublie'...")
 d.save_screenshot("forgotv3-pwd.png")

 # JS: trouve element avec texte contenant 'oublie'
 el=d.execute_script("""
  var all=document.querySelectorAll('*');
  for(var i=0;i<all.length;i++){
   var t=(all[i].innerText||all[i].textContent||'').toLowerCase();
   if(t.indexOf('mot de passe oubli')>=0 || t.indexOf('forgot password')>=0){
    return all[i];
   }
  }
  return null;
 """)
 if el:
  print(f"[3] JS found element: tag={el.tag_name}, text='{el.text}'")
  # Essayer de trouver un ancetre clickable (a ou button)
  clickable=d.execute_script("""
   var el=arguments[0];
   while(el){
    if(el.tagName==='A'||el.tagName==='BUTTON') return el;
    el=el.parentElement;
   }
   return arguments[0];
  """,el)
  print(f"[3] Clickable ancestor: tag={clickable.tag_name}")
  d.execute_script("arguments[0].scrollIntoView(true);",clickable);hd(0.5,1)
  try:clickable.click();print("[3] Clicked!")
  except Exception as ce:
   print(f"[3] Click fail:{ce}, trying JS click...")
   d.execute_script("arguments[0].click();",clickable);print("[3] JS clicked!")
  hd(5,8)
  c=d.current_url;print(f"[3] URL after:{c}")
  d.save_screenshot("forgotv3-after.png")
  ps=d.page_source
  if "Oui, c'est moi" in ps or "c'est moi" in ps.lower():
   print("[3] 'Oui c est moi'! Wait 30s...")
   for i in range(30):
    time.sleep(1);c=d.current_url
    if "myaccount.google.com" in c.split("?")[0]:print("[3] CONNECTED!");break
    if i%5==0:print(f"[3] ...{i}s")
  elif "code" in ps.lower() or "verification" in ps.lower():
   print("[3] Code page");d.save_screenshot("forgotv3-code.png")
  else:
   print("[3] Unknown page");d.save_screenshot("forgotv3-unknown.png")
 else:
  print("[3] JS did NOT find element!")
  # Last resort: dump page HTML for analysis
  html=d.page_source
  idx=html.lower().find('oubli')
  if idx>=0:
   print(f"[3] 'oubli' found in HTML at pos {idx}")
   print(f"[3] Context: ...{html[max(0,idx-100):idx+200]}...")

 print(f"[4] Final URL:{d.current_url}")
except Exception as e:print(f"[X] ERR:{e}");d.save_screenshot("forgotv3-err.png")
finally:print("[Z] Close");hd(5,5);d.quit()
