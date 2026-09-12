/**
 * Test complet auth avec config MOBILE
 * Google est moins strict en mobile
 */
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const delay = ms => new Promise(r => setTimeout(r, ms));

async function testFullMobile() {
  console.log('========================================');
  console.log('  TEST AUTH COMPLET - MOBILE');
  console.log('========================================\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--user-agent=Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
      '--window-size=412,915',
      '--lang=fr-FR,fr',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled'
    ],
    defaultViewport: { width: 412, height: 915, isMobile: true, hasTouch: true }
  });

  try {
    const page = await browser.newPage();

    // Touch + webdriver patch
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const email = 'clientwebg2@gmail.com';
    const password = 'Cadeau974';

    console.log('Navigation...');
    await page.goto('https://accounts.google.com/signin/v2/identifier?continue=https%3A%2F%2Fmyaccount.google.com%2F', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await delay(3000);
    console.log('URL:', page.url());

    // EMAIL
    console.log('Tentative email...');
    try {
      await page.waitForSelector('input[type="email"], input[name="identifier"], #identifierId', { timeout: 5000 });
      await page.type('input[type="email"], input[name="identifier"], #identifierId', email, { delay: 50 + Math.random()*100 });
      await delay(500 + Math.random()*500);
      await page.keyboard.press('Enter');
      console.log('Email soumis');
    } catch (e) {
      console.log('Selecteur email non trouve, screenshot...');
      await page.screenshot({ path: 'mobile-email-fail.png' });
    }

    await delay(4000);
    console.log('URL apres email:', page.url());

    if (page.url().includes('signin/rejected')) {
      console.log('❌ BLOQUE APRES EMAIL');
      return;
    }

    // PASSWORD
    console.log('Tentative password...');
    try {
      await page.waitForSelector('input[type="password"], input[name="password"], input[name="Passwd"]', { timeout: 8000 });
      await page.type('input[type="password"], input[name="password"], input[name="Passwd"]', password, { delay: 50 + Math.random()*100 });
      await delay(500 + Math.random()*500);
      await page.keyboard.press('Enter');
      console.log('Password soumis');
    } catch (e) {
      console.log('Selecteur password non trouve, screenshot...');
      await page.screenshot({ path: 'mobile-password-fail.png' });
    }

    await delay(5000);
    const finalUrl = page.url();
    console.log('URL finale:', finalUrl);

    if (finalUrl.includes('myaccount.google.com') || finalUrl.includes('accounts.google.com/AccountChooser') || finalUrl.includes('mail.google.com')) {
      console.log('✅✅✅ CONNEXION REUSSIE !');
    } else if (finalUrl.includes('challenge') || finalUrl.includes('two')) {
      console.log('⚠️ CHALLENGE 2FA - Compte OK mais besoin validation humaine');
    } else {
      console.log('❌ Resultat incertain');
      await page.screenshot({ path: 'mobile-final.png' });
    }

  } catch (err) {
    console.error('Erreur:', err.message);
  } finally {
    await delay(5000);
    await browser.close();
  }
}

testFullMobile();