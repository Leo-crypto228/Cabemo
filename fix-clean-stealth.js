const fs = require('fs');

let c = fs.readFileSync('worker/google-auth-agent.js', 'utf8');

const oldLaunch = `    const os = require('os');
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

const newLaunch = `    const os = require('os');
    const path = require('path');
    const userDataDir = path.join(os.tmpdir(), 'cademo-profile-' + userId);
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

    const launchOptions = {
      headless: options.headless !== false,
      userDataDir: userDataDir,
      args: [
        '--window-size=1920,1080',
        '--window-position=' + Math.floor(Math.random()*200) + ',' + Math.floor(Math.random()*200),
        '--lang=fr-FR,fr',
        '--no-first-run',
        '--no-default-browser-check',
        '--password-store=basic',
        '--enable-features=NetworkService,NetworkServiceInProcess'
      ],
      defaultViewport: null
    };`;

if (c.includes(oldLaunch)) {
  c = c.replace(oldLaunch, newLaunch);
  fs.writeFileSync('worker/google-auth-agent.js', c);
  console.log('Clean stealth applied');
} else {
  console.log('Old launch block not found exactly, trying regex...');
  // fallback: replace just the args array if possible
  c = c.replace(/--no-sandbox',\n        '--disable-setuid-sandbox',\n        '--disable-dev-shm-usage',\n        '--disable-accelerated-2d-canvas',\n        '--disable-gpu',/, "// --no-sandbox removed for stealth");
  fs.writeFileSync('worker/google-auth-agent.js', c);
  console.log('Fallback replacement done');
}