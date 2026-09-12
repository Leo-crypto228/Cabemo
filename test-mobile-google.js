/**
 * Dernier essai : approche MOBILE sur Google Login
 * Google est moins strict sur mobile
 */
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const delay = ms => new Promise(r => setTimeout(r, ms));

async function testMobileGoogle() {
  console.log('========================================');
  console.log('  TEST MOBILE GOOGLE LOGIN');
  console.log('========================================\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      '--window-size=390,844',
      '--lang=fr-FR,fr',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true }
  });

  try {
    const page = await browser.newPage();

    // Touch events
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 1 });
    });

    console.log('Navigation vers Google mobile...');
    await page.goto('https://accounts.google.com/v3/signin/identifier?continue=https%3A%2F%2Fmyaccount.google.com%2F&flowName=GlifWebSignIn&flowEntry=ServiceLogin', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await delay(3000);

    const url = page.url();
    console.log('URL actuelle:', url);

    if (url.includes('signin/rejected')) {
      console.log('❌ BLOQUE MEME EN MOBILE - Google detecte le bot');
      console.log('Solution: Adspower obligatoire');
    } else if (url.includes('challenge') || url.includes('password') || url.includes('signin/v2')) {
      console.log('✅ PASSE L ETAPE EMAIL !');
      console.log('URL:', url);
    } else {
      console.log('Page email chargee, pas de blocage detecte');
      await page.screenshot({ path: 'mobile-test.png' });
      console.log('Screenshot: mobile-test.png');
    }

  } catch (err) {
    console.error('Erreur:', err.message);
  } finally {
    await delay(3000);
    await browser.close();
  }
}

testMobileGoogle();