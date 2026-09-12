const fs = require('fs');
let c = fs.readFileSync('worker/google-auth-agent.js', 'utf8');

// 1. Harden launch options
const oldLaunch = `    const launchOptions = {
      headless: options.headless !== false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--lang=fr-FR,fr'
      ],
      defaultViewport: { width: 1920, height: 1080 }
    };`;

const newLaunch = `    const os = require('os');
    const path = require('path');
    const userDataDir = path.join(os.tmpdir(), 'cademo-profile-' + userId);
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

    const launchOptions = {
      headless: options.headless !== false,
      userDataDir: userDataDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--window-position=' + Math.floor(Math.random()*200) + ',' + Math.floor(Math.random()*200),
        '--lang=fr-FR,fr',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-features=BlockInsecurePrivateNetworkRequests',
        '--no-first-run',
        '--no-default-browser-check'
      ],
      defaultViewport: { width: 1920, height: 1080 }
    };`;

if (c.includes(oldLaunch)) {
  c = c.replace(oldLaunch, newLaunch);
  console.log('Hardened launch options');
} else {
  console.log('Could not find old launch block exactly. Doing targeted inserts...');
}

// 2. Ensure fs and path are imported at top if not already
if (!c.includes("const fs = require('fs');")) {
  c = c.replace("const puppeteer = require('puppeteer-extra');", "const fs = require('fs');\nconst path = require('path');\nconst puppeteer = require('puppeteer-extra');");
  console.log('Added fs/path imports');
}

// 3. Add random mouse movements before email
const beforeEmail = `    // ETAPE EMAIL (robuste avec Entree)`;
const mouseMovement = `    // ANTI-DETECTION: mouvements souris aleatoires
    await page.mouse.move(400 + Math.random()*200, 300 + Math.random()*150);
    await delay(200 + Math.random()*400);
    await page.mouse.move(600 + Math.random()*200, 400 + Math.random()*150);
    await delay(300 + Math.random()*300);

    // ETAPE EMAIL (robuste avec Entree)`;
if (c.includes(beforeEmail) && !c.includes('mouvements souris aleatoires')) {
  c = c.replace(beforeEmail, mouseMovement);
  console.log('Added mouse movements');
}

// 4. Change API default to headless false for validation endpoint in server-complete.js
let server = fs.readFileSync('server-complete.js', 'utf8');
const oldApi = "    const { headless = true } = req.body;";
const newApi = "    const { headless = false } = req.body;";
if (server.includes(oldApi)) {
  server = server.replace(oldApi, newApi);
  fs.writeFileSync('server-complete.js', server);
  console.log('Changed API default to headless:false');
} else {
  console.log('Could not find headless API setting in server-complete.js');
}

fs.writeFileSync('worker/google-auth-agent.js', c);
console.log('Stealth fix applied to google-auth-agent.js');