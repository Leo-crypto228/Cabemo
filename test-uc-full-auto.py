"""TEST"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import time,random,requests

EMAIL="clientwebg2@gmail.com"
REAL_PASSWORD="ClientGoogle2026."
OLLAMA_URL="http://localhost:11434/api/generate"
OLLAMA_MODEL="llama3.2"

def hd(a=2,b=5):time.sleep(random.uniform(a,b))

def ht(el,txt):
 for ch in txt:
  el.send_keys(ch);time.sleep(random.uniform(0.03,0.25))
  if random.random()<0.05:time.sleep(random.uniform(0.2,0.8))
 hd(0.5,1.5)

def ollama(cmp,cat="restaurant",rt=5):
 p=f"Tu es un client francais. Avis Google {rt} etoiles pour '{cmp}' (cat:{cat}). 2-4 phrases naturel sans fautes. Texte seul."
 try:
  r=requests.post(OLLAMA_URL,json={"model":OLLAMA_MODEL,"prompt":p,"stream":False},timeout=60)
  d=r.json();return d.get("response",d.get("text","")).strip().strip('"')
 except Exception as e:print(f"[-] Ollama:{e}");return None

def log(s,m):print(f"[{s}] {m}")

def main():
 print("="*60);print("  TEST COMPLET");print("="*60)
 o=uc.ChromeOptions()
 o.add_argument("--lang=fr-FR")
 o.add_argument("--window-size=1920,1080")
 o.add_argument("--disable-blink-features=AutomationControlled")
 o.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
 d=uc.Chrome(options=o,version_main=151)
 w=WebDriverWait(d,15)
 try:
  log("1","Ouverture...")
  d.get("https://accounts.google.com/signin/v2/identifier?continue=https%3A%2F%2Fmyaccount.google.com%2F")
  hd(3,5);c=d.current_url;log("1",f"URL:{c}")
  if "signin/rejected" in c:log("1","BLOQUE");return False
  log("2","Email...")
  e=w.until(EC.presence_of_element_located((By.CSS_SELECTOR,"input[type='email'],input[name='identifier'],#identifierId")))
  ht(e,EMAIL);log("2","Email tape");hd(0.5,2);e.send_keys(Keys.ENTER);log("2","Soumis");hd(4,6)
  c=d.current_url;log("2",f"URL:{c}")
  if "signin/rejected" in c:log("2","BLOQUE");return False
  if "challenge/pwd" in c or "password" in c:
   log("3","Password page")
   log("3","Try 'Forgot password'...")
   try:
    f=d.find_element(By.XPATH,"//button[contains(.,'Mot de passe oublie')] | //a[contains(.,'Mot de passe oublie')] | //span[contains(.,'Mot de passe oublie')]/ancestor::button | //span[contains(.,'Forgot password')]/ancestor::button")
    hd(1,3);f.click();log("3","Clicked");hd(5,8)
    c=d.current_url;log("3",f"URL:{c}")
    ps=d.page_source
    if "Oui, c'est moi" in ps or "c'est moi" in ps.lower():
     log("3","'Oui c est moi' detected!")
     log("3","Waiting 30s for user...")
     for i in range(30):
      time.sleep(1);c=d.current_url
      if "myaccount.google.com" in c.split("?")[0]:log("3","USER VALIDATED!");break
      if i%5==0:log("3",f"...{i}s")
     if "myaccount.google.com" not in c.split("?")[0]:log("3","Timeout");return False
    else:log("3","No 'Oui c est moi'");d.save_screenshot("uc-forgot.png");return False
   except Exception as ex:
    log("3",f"Forgot fail:{ex}")
    log("3","Try REAL password...")
    try:
     p=w.until(EC.presence_of_element_located((By.CSS_SELECTOR,"input[type='password'],input[name='password'],input[name='Passwd']")))
     ht(p,REAL_PASSWORD);log("3","Typed");hd(0.5,2);p.send_keys(Keys.ENTER);log("3","Submitted");hd(4,7)
     c=d.current_url;log("3",f"URL:{c}")
     if "myaccount.google.com" in c.split("?")[0]:log("3","CONNECTED WITH REAL PASSWORD!")
     elif "challenge" in c or "signin/v2/challenge" in c:
      ps=d.page_source
      if "Oui, c'est moi" in ps or "c'est moi" in ps.lower():
       log("3","'Oui c est moi'!");log("3","Wait 30s...")
       for i in range(30):
        time.sleep(1)
        if "myaccount.google.com" in d.current_url.split("?")[0]:log("3","USER VALIDATED!");break
        if i%5==0:log("3",f"...{i}s")
      else:log("3","Other challenge");d.save_screenshot("uc-challenge.png");return False
     else:log("3","Refused");d.save_screenshot("uc-refused.png");return False
    except Exception as e2:log("3",f"Pwd err:{e2}");return False
  c=d.current_url
  if "myaccount.google.com" in c.split("?")[0]:
   log("4","="*50);log("4","CONNECTED!");log("4","="*50)
   ck=d.get_cookies();log("4",f"Cookies:{len(ck)}")
   for x in ck:
    if any(y in x["name"]for y in["SID","SSID","APISID","SAPISID","__Secure-1PSID"]):
     log("4",f" {x['name']}:{x['value'][:30]}...")
   log("5","Ollama...")
   av=ollama("Boulangerie Dupont","boulangerie",5)
   if av:log("5",f"Avis:{av[:80]}...")
   else:av="Super experience!";log("5","Default")
   log("6","Google Maps...")
   d.get("https://www.google.com/maps");hd(3,5)
   log("6","Search...")
   s=w.until(EC.presence_of_element_located((By.ID,"searchboxinput")))
   ht(s,"Boulangerie Dupont");hd(0.5,1);s.send_keys(Keys.ENTER);hd(4,6)
   log("6","Screenshot");d.save_screenshot("uc-maps.png")
   log("6","Done");return True
  else:log("4",f"Not connected:{c}");d.save_screenshot("uc-nc.png");return False
 except Exception as e:
  log("X",f"ERR:{e}")
  try:d.save_screenshot("uc-err.png")
  except:pass
  return False
 finally:
  log("Z","Closing 3s...");hd(3,3);d.quit();log("Z","Done")

if __name__=="__main__":
 r=main();print();print("="*60)
 if r:print("  SUCCESS!")
 else:print("  FAILED")
 print("="*60)
