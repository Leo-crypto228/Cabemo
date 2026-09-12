"""Test 'Mot de passe oublie' - Shadow DOM recursive scanner"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import time,random

def hd(a=2,b=5):time.sleep(random.uniform(a,b))
EMAIL="clientwebg2@gmail.com"

print("="*60);print("TEST FORGOT v4 - SHADOW DOM SCANNER");print("="*60)
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
 print("[3] Pwd page - Shadow DOM recursive scan...")
 d.save_screenshot("forgotv4-pwd.png")

 # JS: recursive shadow DOM scanner, find DEEPEST element with text
 result=d.execute_script("""
  function findDeepest(root, text, depth) {
    let best = null, bestDepth = -1;
    function scan(el, d) {
      const tc = (el.textContent || '').toLowerCase();
      if (tc.indexOf(text) >= 0) {
        if (d > bestDepth) { best = el; bestDepth = d; }
      }
      if (el.shadowRoot) {
        for (let c of el.shadowRoot.children) scan(c, d+1);
      }
      for (let c of el.children) scan(c, d+1);
    }
    scan(root, depth);
    return best;
  }
  var el = findDeepest(document.documentElement, 'mot de passe oubli', 0);
  if (!el) el = findDeepest(document.documentElement, 'forgot password', 0);
  
  if (!el) return null;
  
  // Try to find clickable ancestor
  var clickable = el;
  while (clickable && clickable.tagName !== 'A' && clickable.tagName !== 'BUTTON') {
    var parent = clickable.parentElement;
    if (!parent && clickable.getRootNode && clickable.getRootNode().host) {
      parent = clickable.getRootNode().host;
    }
    if (!parent) break;
    clickable = parent;
  }
  
  return {
    elTag: el.tagName,
    elText: (el.textContent || '').substring(0,100),
    clickTag: clickable ? clickable.tagName : 'none',
    clickText: clickable ? (clickable.textContent || '').substring(0,100) : 'none'
  };
 """)
 print(f"[3] Scan result:{result}")

 if result and result.get('clickTag') != 'none':
  print(f"[3] Found clickable: {result['clickTag']} with text '{result['clickText']}'")
  # Get the element back and click it
  clickable=d.execute_script("""
   function findDeepest(root, text, depth) {
    let best = null, bestDepth = -1;
    function scan(el, d) {
     const tc = (el.textContent || '').toLowerCase();
     if (tc.indexOf(text) >= 0) { if (d > bestDepth) { best = el; bestDepth = d; } }
     if (el.shadowRoot) { for (let c of el.shadowRoot.children) scan(c, d+1); }
     for (let c of el.children) scan(c, d+1);
    }
    scan(root, depth); return best;
   }
   var el = findDeepest(document.documentElement, 'mot de passe oubli', 0);
   if (!el) el = findDeepest(document.documentElement, 'forgot password', 0);
   var clickable = el;
   while (clickable && clickable.tagName !== 'A' && clickable.tagName !== 'BUTTON') {
    var parent = clickable.parentElement;
    if (!parent && clickable.getRootNode && clickable.getRootNode().host) parent = clickable.getRootNode().host;
    if (!parent) break;
    clickable = parent;
   }
   return clickable;
  """)
  if clickable:
   d.execute_script("arguments[0].scrollIntoView(true);",clickable);hd(0.5,1)
   try:clickable.click();print("[3] Clicked!")
   except Exception as ce:
    print(f"[3] Click fail:{ce}, JS click...")
    d.execute_script("arguments[0].click();",clickable);print("[3] JS clicked!")
   hd(5,8)
   c=d.current_url;print(f"[3] URL after:{c}")
   d.save_screenshot("forgotv4-after.png")
   ps=d.page_source
   if "Oui, c'est moi" in ps or "c'est moi" in ps.lower():
    print("[3] 'Oui c est moi'! Wait 30s...")
    for i in range(30):
     time.sleep(1);c=d.current_url
     if "myaccount.google.com" in c.split("?")[0]:print("[3] CONNECTED!");break
     if i%5==0:print(f"[3] ...{i}s")
   elif "code" in ps.lower() or "verification" in ps.lower():
    print("[3] Code page");d.save_screenshot("forgotv4-code.png")
   else:
    print("[3] Unknown page");d.save_screenshot("forgotv4-unknown.png")
  else:
   print("[3] Could not get clickable element back!")
 else:
  print("[3] No clickable found!")
  # Dump all element tags for debug
  tags=d.execute_script("""
   var all=document.querySelectorAll('*');var r=[];
   for(var i=0;i<all.length;i++){
    var t=(all[i].textContent||'').toLowerCase();
    if(t.indexOf('oubli')>=0) r.push(all[i].tagName+': '+all[i].textContent.substring(0,60));
   }
   return r;
  """)
  print(f"[3] Elements with 'oubli' in text (non-shadow):{tags}")

 print(f"[4] Final URL:{d.current_url}")
except Exception as e:print(f"[X] ERR:{e}");d.save_screenshot("forgotv4-err.png")
finally:print("[Z] Close");hd(5,5);d.quit()
