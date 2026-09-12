const fs = require('fs');
let c = fs.readFileSync('worker/google-auth-agent.js', 'utf8');

// Supprime la ligne executablePath require
const lines = c.split('\n');
const out = [];
for (const line of lines) {
  if (line.includes("const { executablePath } = require('puppeteer');")) continue;
  if (line.includes("      executablePath: executablePath(),")) continue;
  if (line.includes("const { getProxyForAccount, formatPuppeteerProxy }")) {
    out.push("const { getProxyForAccount } = require('./proxy-rotator');");
    continue;
  }
  out.push(line);
}
fs.writeFileSync('worker/google-auth-agent.js', out.join('\n'));
console.log('Fix applied. Lines removed:', lines.length - out.length);