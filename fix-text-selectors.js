const fs = require('fs');

function fixHasText(content) {
  // Replace :has-text in google-auth-agent specific lines
  content = content.replace(
    `await page.click('button:has-text("Suivant"), button:has-text("Next"), #identifierNext');`,
    `await clickByText(page, ['Suivant', 'Next']);`
  );
  content = content.replace(
    `await page.click('button:has-text("Suivant"), button:has-text("Next"), #passwordNext');`,
    `await clickByText(page, ['Suivant', 'Next']);`
  );
  content = content.replace(
    `const forgotLink = await page.$('text=Mot de passe oublie') || \n                         await page.$('text=Forgot password') ||\n                         await page.$('a[href*="signin/recovery"]');`,
    `const forgotLink = await findByText(page, ['Mot de passe oublie', 'Forgot password']) || await page.$('a[href*="signin/recovery"]');`
  );
  content = content.replace(
    `const notificationBtn = await page.$('text=Essayer une autre methode') ||\n                                  await page.$('text=Try another way');`,
    `const notificationBtn = await findByText(page, ['Essayer une autre methode', 'Try another way']);`
  );
  content = content.replace(
    `if (text && (text.includes('telephone') || text.includes('approuver') || text.includes('notification'))) {`,
    `if (text && (text.includes('telephone') || text.includes('approuver') || text.includes('notification') || text.includes('phone'))) {`
  );
  content = content.replace(
    `const btn = await page.$('button:has-text("Ecrire un avis"), button:has-text("Write a review")');`,
    `const btn = await findByText(page, ['Ecrire un avis', 'Write a review', 'Add a review']);`
  );
  content = content.replace(
    `const submit = await page.$('button:has-text("Publier"), button:has-text("Post")');`,
    `const submit = await findByText(page, ['Publier', 'Post', 'Publish']);`
  );
  return content;
}

function addHelpers(content, isBusiness) {
  const helper = `
/**
 * Trouve et clique sur un element par texte (Puppeteer-safe)
 */
async function clickByText(page, texts) {
  const found = await page.evaluate((texts) => {
    const els = Array.from(document.querySelectorAll('button, div[role="button"], a, span[role="button"], input[type="button"]'));
    for (const text of texts) {
      const el = els.find(e => e.innerText && e.innerText.trim().toLowerCase().includes(text.toLowerCase()));
      if (el) { el.click(); return true; }
    }
    return false;
  }, texts);
  return found;
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
  const element = handle.asElement();
  return element;
}
`;
  // Insert helper after the HUMAN_DELAY lines, before the main function
  const insertMarker = isBusiness ? 'const TYPING_DELAY = () => 50 + Math.random() * 150;' : "const HUMAN_DELAY = () => 2000 + Math.random() * 3000;";
  if (!content.includes('async function clickByText')) {
    content = content.replace(insertMarker, insertMarker + '\n\n' + helper.trim());
  }
  return content;
}

// Fix google-auth-agent.js
let auth = fs.readFileSync('worker/google-auth-agent.js', 'utf8');
auth = fixHasText(auth);
auth = addHelpers(auth, false);
fs.writeFileSync('worker/google-auth-agent.js', auth);
console.log('Fixed google-auth-agent.js');

// Fix google-business-agent.js
let biz = fs.readFileSync('worker/google-business-agent.js', 'utf8');
biz = fixHasText(biz);
if (!biz.includes('async function clickByText')) {
  biz = biz.replace(
    'function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }',
    'function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }\n\nasync function clickByText(page, texts) {\n  return await page.evaluate((texts) => {\n    const els = Array.from(document.querySelectorAll(\'button, div[role="button"], a, span[role="button"], input[type="button"]\'));\n    for (const text of texts) {\n      const el = els.find(e => e.innerText && e.innerText.trim().toLowerCase().includes(text.toLowerCase()));\n      if (el) { el.click(); return true; }\n    }\n    return false;\n  }, texts);\n}\n\nasync function findByText(page, texts) {\n  const handle = await page.evaluateHandle((texts) => {\n    const els = Array.from(document.querySelectorAll(\'button, div[role="button"], a, span[role="button"], input[type="button"], [role="link"]\'));\n    for (const text of texts) {\n      const el = els.find(e => e.innerText && e.innerText.trim().toLowerCase().includes(text.toLowerCase()));\n      if (el) return el;\n    }\n    return null;\n  }, texts);\n  return handle.asElement();\n}'
  );
}
fs.writeFileSync('worker/google-business-agent.js', biz);
console.log('Fixed google-business-agent.js');