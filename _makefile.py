content = '''"""TEST COMPLET - Undetected Chrome + Delai humain + Ollama"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import time, random, requests

EMAIL = "clientwebg2@gmail.com"
REAL_PASSWORD = "ClientGoogle2026."
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2"

def human_delay(a=2, b=5):
    time.sleep(random.uniform(a, b))

def human_type(el, txt):
    for ch in txt:
        el.send_keys(ch)
        time.sleep(random.uniform(0.03, 0.25))
        if random.random() < 0.05:
            time.sleep(random.uniform(0.2, 0.8))
    human_delay(0.5, 1.5)

def ask_ollama(company, cat="restaurant", rating=5):
    prompt = f"""Tu es un client francais lambda. Redige un avis Google authentique de {rating} etoiles pour '{company}' (categorie: {cat}).
2 a 4 phrases, naturel, sans fautes. Ne mentionne jamais que tu es une IA.
Reponds UNIQUEMENT avec le texte de l avis."""
    try:
        r = requests.post(OLLAMA_URL, json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}, timeout=60)
        d = r.json()
        return d.get("response", d.get("text", "")).strip().strip('"')
    except Exception as e:
        print(f"[-] Ollama err: {e}")
        return None

def log(step, msg):
    print(f"[{step}] {msg}")
'''
with open('test-uc-full-auto.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Part 1 done')
