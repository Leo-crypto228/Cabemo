/**
 * AGENT IA - Actions sur Google Business
 */
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { getProxyForAccount } = require("./proxy-rotator");
const { setRelay } = require("./relay-store");
const { getUserCredentials } = require("../api/supabase-client");
const { loadSession, applySessionToPage } = require("./session-manager");

puppeteer.use(StealthPlugin());
const HUMAN_DELAY = () => 2000 + Math.random() * 3000;
const TYPING_DELAY = () => 50 + Math.random() * 150;

async function generateReviewWithOllama(companyName, category, rating) {
  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        prompt: "Tu es un client francais lambda. Redige un avis Google authentique de " + rating + " etoiles pour l entreprise " + companyName + " (categorie: " + category + "). L avis doit faire 2 a 4 phrases, naturel, sans fautes d orthographe evidentes. Ne mentionne jamais que tu es une IA. Reponds UNIQUEMENT avec le texte de l avis, sans preambule.",
        stream: false
      })
    });
    const data = await response.json();
    const reviewText = data.response ? data.response.trim() : (data.text ? data.text.trim() : "Tres bon service, je recommande.");
    console.log("[OLLAMA] Avis genere: \"" + reviewText.substring(0, 50) + "...\"");
    return reviewText;
  } catch (error) {
    console.error("[OLLAMA] Erreur generation avis:", error.message);
    return "Tres satisfait de " + companyName + ". Service professionnel et rapide. Je recommande vivement.";
  }
}

async function postGoogleReview(userId, companyName, category, rating, options) {
  rating = rating || 5;
  options = options || {};
  const session = await loadSession(userId);
  if (!session) {
    return { success: false, error: "Pas de session active. Validez d abord le compte." };
  }
  const proxy = getProxyForAccount(userId);
  let browser = null;
  try {
    const launchOptions = {
      headless: options.headless !== false,
      args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--window-size=1920,1080","--lang=fr-FR,fr"],
      defaultViewport: { width: 1920, height: 1080 }
    };
    if (proxy) launchOptions.args.push("--proxy-server=" + proxy.url);
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await applySessionToPage(page, session);

    await page.goto("https://www.google.com/maps/search/" + encodeURIComponent(companyName + " " + category), { waitUntil: "networkidle2", timeout: 60000 });
    await delay(HUMAN_DELAY() * 2);

    // Accepter les cookies si banner présent
    const cookieBtn = await findByText(page, ['Tout accepter', 'Accept all', "J'accepte", 'Accepter', 'Agree']);
    if (cookieBtn) {
      await cookieBtn.click().catch(() => {});
      console.log("[GBA] Cookies acceptés");
      await delay(HUMAN_DELAY());
    }

    await detectAndRelayPhoneChallenge(page, userId);

        // 1. Clique sur l'entreprise dans la liste de résultats (panneau gauche)
    let clickedBusiness = false;
    try {
      await page.waitForSelector('a[href*="/maps/place"], [data-result-index]', { timeout: 15000 });
    } catch (e) {
      console.log("[GBA] Résultats non chargés, tentative directe...");
    }
    clickedBusiness = await clickByText(page, [companyName]);
    if (!clickedBusiness) {
      clickedBusiness = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/maps/place"]'));
        const first = links.find(a => {
          const rect = a.getBoundingClientRect();
          return rect.top > 80 && rect.left < window.innerWidth * 0.6;
        });
        if (first) { first.click(); return true; }
        return false;
      });
    }
    if (!clickedBusiness) {
      clickedBusiness = await page.evaluate(() => {
        const sel = '[data-result-index="0"] a, [jsaction*="pane.result"] a, [jsaction*="pane.result"] div[role="button"]';
        const el = document.querySelector(sel);
        if (el) { el.click(); return true; }
        return false;
      });
    }
    if (clickedBusiness) {
      console.log("[GBA] Entreprise cliquée dans la liste");
      await delay(HUMAN_DELAY() * 2);
    } else {
      console.log("[GBA] Impossible de cliquer l'entreprise, tentative de continuer...");
      await page.screenshot({ path: "./debug_no_business_click_" + userId + "_" + Date.now() + ".png", fullPage: true });
    }

    await detectAndRelayPhoneChallenge(page, userId);

        // 2. Onglet Avis (si présent dans la fiche)
    const clickedReviewsTab = await clickByText(page, ['Avis', 'Reviews']);
    if (clickedReviewsTab) {
      console.log("[GBA] Onglet Avis cliqué");
      await delay(HUMAN_DELAY() * 2);
    }

    await detectAndRelayPhoneChallenge(page, userId);

        // 3. Bouton Rédiger / Écrire un avis
    let btn = null;
    const reviewBtnTexts = ['Écrire un avis', 'Rédiger un avis', 'Write a review', 'Add a review', 'Donner un avis', 'Laisser un avis', 'Poster un avis', 'Ajouter un avis'];
    try {
      btn = await page.waitForFunction((texts) => {
        const all = Array.from(document.querySelectorAll('button, div[role="button"], a, span, input[type="button"], [role="link"]'));
        for (const el of all) {
          const t = (el.innerText || el.getAttribute('aria-label') || '').trim().toLowerCase();
          for (const txt of texts) {
            if (t.includes(txt.toLowerCase())) {
              const clickable = el.closest('button, [role="button"], a, input[type="button"], [role="link"]');
              return clickable || el;
            }
          }
        }
        return null;
      }, { timeout: 20000 }, reviewBtnTexts);
      btn = await btn.asElement();
    } catch (e) {
      console.log("[GBA] Timeout bouton avis, fallback CSS selectors...");
    }
    if (!btn) {
      // Fallback sélecteurs CSS spécifiques Google Maps
      btn = await page.$('[aria-label*="avis" i], [aria-label*="review" i], button[data-item-id*="write"], button[jsaction*="review"], div[role="button"][aria-label*="avis" i]');
    }
    if (!btn) {
      // Dernier fallback : chercher par icône étoile + texte "Avis"
      btn = await page.evaluateHandle(() => {
        const all = Array.from(document.querySelectorAll('div[role="button"], button'));
        return all.find(el => {
          const txt = (el.innerText || '').toLowerCase();
          const hasStar = el.querySelector('svg, img, span[class*="star"], span[class*="etoile"], span[class*="google-symbols"]') !== null;
          return hasStar && (txt.includes('avis') || txt.includes('review'));
        }) || null;
      });
      btn = btn ? await btn.asElement() : null;
    }
    if (!btn) {
      await page.screenshot({ path: "./debug_review_" + userId + "_" + Date.now() + ".png", fullPage: true });
      await browser.close();
      return { success: false, error: "Bouton avis introuvable après 20s" };
    }
    // Clic robuste sur le bouton avis
    let clickOk = false;
    try {
      await btn.click();
      clickOk = true;
    } catch (e) {
      console.log("[GBA] Puppeteer click echoue, tentative JS click...");
      try {
        await page.evaluate((el) => el.click(), btn);
        clickOk = true;
      } catch (e2) {
        console.log("[GBA] JS click echoue aussi:", e2.message);
      }
    }
    if (!clickOk) {
      try {
        await page.evaluate(() => {
          const all = Array.from(document.querySelectorAll('button, [role="button"]'));
          const el = all.find(e => (e.innerText || '').toLowerCase().includes('avis') || (e.innerText || '').toLowerCase().includes('review'));
          if (el) el.click();
        });
        clickOk = true;
      } catch (e3) {}
    }
    console.log("[GBA] Bouton 'Ecrire un avis' clique (ou tente)");
    await delay(3000);

    await detectAndRelayPhoneChallenge(page, userId);

        // Attendre activement que le formulaire apparaisse (champ texte ou etoiles)
    let formReady = false;
    try {
      await page.waitForFunction(() => {
        const hasText = !!document.querySelector('textarea, div[role="textbox"], div[contenteditable="true"], input[placeholder*="avis" i], input[placeholder*="review" i]');
        const hasStars = !!document.querySelector('[aria-label*="etoile" i], [aria-label*="star" i], [aria-label*="Etoile" i], .U6stEc, [role="radio"]');
        return hasText || hasStars;
      }, { timeout: 25000 });
      formReady = true;
      console.log("[GBA] Formulaire detecte (texte ou etoiles)");
    } catch (e) {
      console.log("[GBA] Formulaire non detecte apres 25s, screenshot debug...");
    }
    await delay(2000);
    await page.screenshot({ path: "./debug_review_form_" + userId + "_" + Date.now() + ".png", fullPage: true });

    let txt = null;
    try {
      txt = await page.waitForSelector('textarea, div[role="textbox"], div[contenteditable="true"], input[placeholder*="avis" i], input[placeholder*="review" i]', { visible: true, timeout: 10000 });
    } catch (e) {
      txt = await page.$('textarea, div[role="textbox"], div[contenteditable="true"], input[placeholder*="avis" i], input[placeholder*="review" i]');
    }
    if (!txt) {
      await page.screenshot({ path: "./debug_review_no_textbox_" + userId + "_" + Date.now() + ".png", fullPage: true });
      await browser.close();
      return { success: false, error: "Champ texte introuvable apres ouverture du formulaire" };
    }

    // ---- ETOILES ----
    let starsClicked = false;
    try {
      starsClicked = await page.evaluate((r) => {
        const clickStar = (el) => {
          if (!el) return false;
          el.scrollIntoView({ block: 'center', inline: 'center' });
          el.click();
          if (el.focus) el.focus();
          ['mousedown', 'mouseup', 'click'].forEach(evt => {
            el.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window }));
          });
          return true;
        };

        // 1. aria-label partiel
        const labels = [r + ' etoile', r + ' etoiles', r + ' star', r + ' stars', 'Noter ' + r, 'Donner ' + r + ' etoiles'];
        const allAria = Array.from(document.querySelectorAll('[aria-label]'));
        for (const label of labels) {
          const el = allAria.find(e => (e.getAttribute('aria-label') || '').toLowerCase().includes(label.toLowerCase()));
          if (el && clickStar(el)) return true;
        }

        // 2. Conteneur connu Google Maps
        const container = document.querySelector('.U6stEc');
        if (container) {
          const children = Array.from(container.children);
          if (children.length >= r) {
            if (clickStar(children[r - 1])) return true;
          }
        }

        // 3. Premier conteneur avec >=5 enfants interactifs star-like
        const candidates = document.querySelectorAll('ol, ul, div[role="radiogroup"], fieldset');
        for (const c of candidates) {
          const children = Array.from(c.children).filter(ch => {
            const role = ch.getAttribute('role');
            const lbl = (ch.getAttribute('aria-label') || '').toLowerCase();
            const cls = (ch.className || '').toLowerCase();
            return role === 'radio' || role === 'img' || lbl.includes('etoile') || lbl.includes('star') || cls.includes('star') || cls.includes('etoile') || cls.includes('hfpzdd');
          });
          if (children.length >= 5) {
            if (clickStar(children[r - 1])) return true;
          }
        }

        // 4. Fallback role=radio
        const radios = Array.from(document.querySelectorAll('[role="radio"]'));
        if (radios.length >= r) {
          if (clickStar(radios[r - 1])) return true;
        }
        return false;
      }, rating);
      if (starsClicked) {
        console.log("[GBA] " + rating + " etoiles selectionnees");
      } else {
        console.log("[GBA] Etoiles non trouvees, screenshot debug...");
        await page.screenshot({ path: "./debug_review_no_stars_" + userId + "_" + Date.now() + ".png", fullPage: true });
      }
    } catch (e) {
      console.log("[GBA] Erreur lors du clic etoiles:", e.message);
    }
    await delay(HUMAN_DELAY());
    // ---- TEXTE ----
    let reviewText = await generateReviewWithOllama(companyName, category, rating);

    try {
      await txt.click().catch(() => {});
      await delay(500);
      const tagName = await txt.evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'textarea' || tagName === 'input') {
        await txt.evaluate((el, text) => { el.value = text; }, reviewText);
        await txt.evaluate((el) => {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await txt.type(' ', { delay: 50 });
        await page.keyboard.press('Backspace');
      } else {
        await txt.evaluate((el, text) => {
          el.innerText = text;
          el.textContent = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, reviewText);
        await page.keyboard.type(' ', { delay: 50 });
        await page.keyboard.press('Backspace');
      }
      console.log("[GBA] Texte saisi (" + reviewText.length + " caracteres)");
    } catch (e) {
      console.log("[GBA] Erreur saisie texte:", e.message);
      await page.screenshot({ path: "./debug_review_text_error_" + userId + "_" + Date.now() + ".png", fullPage: true });
      await browser.close();
      return { success: false, error: "Erreur lors de la saisie du texte: " + e.message };
    }
    await delay(HUMAN_DELAY());

    // Screenshot avant publication
    await page.screenshot({ path: "./debug_review_filled_" + userId + "_" + Date.now() + ".png", fullPage: true });

    // ---- SUBMIT ----
    let submitted = false;
    try {
      const submit = await findByText(page, ['Publier', 'Post', 'Publish', 'Envoyer', 'Soumettre']);
      if (submit) {
        await submit.click();
        submitted = true;
        console.log("[GBA] Avis soumis !");
      } else {
        submitted = await page.evaluate(() => {
          const all = Array.from(document.querySelectorAll('button, [role="button"]'));
          const el = all.find(e => {
            const t = (e.innerText || e.getAttribute('aria-label') || '').toLowerCase();
            return t.includes('publier') || t.includes('post') || t.includes('publish') || t.includes('envoyer');
          });
          if (el) { el.click(); return true; }
          return false;
        });
        if (submitted) console.log("[GBA] Avis soumis (via JS fallback) !");
      }
    } catch (e) {
      console.log("[GBA] Erreur submit:", e.message);
    }

    if (submitted) {
      await delay(HUMAN_DELAY() * 3);
      const t = await page.evaluate(function() { return document.body.innerText; });
      const ok = t.indexOf("Merci") >= 0 || t.indexOf("publie") >= 0 || t.indexOf("posted") >= 0 || t.indexOf("merci") >= 0;
      await browser.close();
      return { success: true, message: ok ? "Avis publie avec succes" : "Avis soumis (confirmation non visible)", reviewText: reviewText, rating: rating, company: companyName };
    } else {
      await page.screenshot({ path: "./debug_submit_" + userId + "_" + Date.now() + ".png" });
      await browser.close();
      return { success: false, error: "Bouton Publier introuvable" };
    }
  } catch (error) {
    console.error("[GBA] ERREUR:", error);
    if (browser) await browser.close();
    return { success: false, error: error.message };
  }
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

async function clickByText(page, texts) {
  return await page.evaluate((texts) => {
    const els = Array.from(document.querySelectorAll('button, div[role="button"], a, span[role="button"], input[type="button"]'));
    for (const text of texts) {
      const el = els.find(e => e.innerText && e.innerText.trim().toLowerCase().includes(text.toLowerCase()));
      if (el) { el.click(); return true; }
    }
    return false;
  }, texts);
}

async function findByText(page, texts) {
  const handle = await page.evaluateHandle((texts) => {
    const els = Array.from(document.querySelectorAll('button, div[role="button"], a, span[role="button"], input[type="button"], [role="link"]'));
    for (const text of texts) {
      const el = els.find(e => e.innerText && e.innerText.trim().toLowerCase().includes(text.toLowerCase()));
      if (el) return el;
    }
    return null;
  }, texts);
  return handle.asElement();
}
/**
 * Détecte une page de vérification par téléphone/code et relaie l'info au frontend.
 */
async function detectAndRelayPhoneChallenge(page, userId) {
  try {
    const bodyText = await page.evaluate(() => document.body.innerText || '');
    const lower = bodyText.toLowerCase();
    const isPhoneChallenge = lower.includes('téléphone') || lower.includes('telephone') || lower.includes('phone') ||
                             lower.includes('numéro') || lower.includes('mobile') || lower.includes('sms') ||
                             lower.includes('code') || lower.includes('vérification') || lower.includes('verifier') ||
                             lower.includes('6 chiffres') || lower.includes('security check');
    if (!isPhoneChallenge) return false;

    // Essayer d'extraire un numéro / texte de méthode
    const phoneMatch = bodyText.match(/(\+?\d[\d\s\-\.]{6,20})/) ||
                       bodyText.match(/(finissant par \d{2,4})/i) ||
                       bodyText.match(/(\.\.\.\d{2,4})/);
    const detectedPhone = phoneMatch ? phoneMatch[0] : null;

    // Essayer d'extraire un code à 6 chiffres visible sur la page
    const codeMatch = bodyText.match(/\b\d{6}\b/);
    const detectedCode = codeMatch ? codeMatch[0] : null;

    // Récupérer l'email lié à l'utilisateur pour le relai
    let email = null;
    try {
      const user = await getUserCredentials(userId);
      email = user && user.google_email ? user.google_email : null;
    } catch (e) { /* ignorer */ }

    if (email) {
      const data = { status: 'phone_challenge' };
      if (detectedPhone) data.phone = detectedPhone;
      if (detectedCode) data.code = detectedCode;
      setRelay(email, data);
      console.log('[GBA] Phone challenge relayer:', JSON.stringify(data));
    }
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { postGoogleReview, generateReviewWithOllama };