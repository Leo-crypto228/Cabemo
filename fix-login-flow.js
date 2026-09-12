const fs = require('fs');

let c = fs.readFileSync('worker/google-auth-agent.js', 'utf8');

// We need to replace the section from "// ETAPE EMAIL" through the password submission with a more robust flow.
// Let's find the exact text to replace.

const oldFlow = `    // ETAPE EMAIL
    console.log('[AGENT] Remplissage email...');
    await page.waitForSelector('input[type="email"], input[name="identifier"], #identifierId', { timeout: 15000 });
    await page.click('input[type="email"], input[name="identifier"], #identifierId');
    await delay(500);
    await page.keyboard.down('Control');
    await page.keyboard.down('a');
    await page.keyboard.up('a');
    await page.keyboard.up('Control');
    await delay(300);
    await page.type('input[type="email"], input[name="identifier"], #identifierId', email, { delay: TYPING_DELAY() });
    await delay(HUMAN_DELAY());

    await clickByText(page, ['Suivant', 'Next']);
    await delay(HUMAN_DELAY() * 2);

    // ETAPE MOT DE PASSE
    console.log('[AGENT] Remplissage mot de passe...');
    await page.waitForSelector('input[type="password"], input[name="password"], #password', { timeout: 15000 });
    await delay(HUMAN_DELAY());
    await page.click('input[type="password"], input[name="password"], #password');
    await delay(300);
    await page.type('input[type="password"], input[name="password"], #password', password, { delay: TYPING_DELAY() });
    await delay(HUMAN_DELAY());

    await clickByText(page, ['Suivant', 'Next']);
    console.log('[AGENT] Mot de passe soumis, attente...');
    await delay(5000);`;

const newFlow = `    // ETAPE EMAIL (robuste avec Entree)
    console.log('[AGENT] Remplissage email...');
    await page.waitForSelector('input[type="email"], input[name="identifier"], #identifierId, input[aria-label*="email"]', { timeout: 20000 });
    await delay(800);
    const emailInput = await page.$('input[type="email"], input[name="identifier"], #identifierId, input[aria-label*="email"]');
    if (!emailInput) throw new Error('Champ email introuvable');
    await emailInput.click();
    await delay(300);
    await emailInput.type(email, { delay: TYPING_DELAY() });
    await delay(1000 + Math.random() * 1000);
    await page.keyboard.press('Enter');
    console.log('[AGENT] Email soumis (Entree), attente transition...');
    await delay(4000 + Math.random() * 2000);

    // ETAPE MOT DE PASSE (robuste avec Entree)
    console.log('[AGENT] Remplissage mot de passe...');
    // Google utilise souvent input[name="Passwd"] avec un P majuscule
    const passSelectors = [
      'input[type="password"]',
      'input[name="Passwd"]',
      'input[name="password"]',
      '#password',
      'input[aria-label*="Mot de passe"]',
      'input[aria-label*="Password"]'
    ];
    let passInput = null;
    for (const sel of passSelectors) {
      passInput = await page.$(sel);
      if (passInput) break;
    }
    if (!passInput) {
      console.log('[AGENT] Champ password non visible, nouvelle tentative dans 3s...');
      await delay(3000);
      for (const sel of passSelectors) {
        passInput = await page.$(sel);
        if (passInput) break;
      }
    }
    if (!passInput) {
      console.log('[AGENT] Screenshot avant echec...');
      await page.screenshot({ path: './debug_no_password_' + userId + '_' + Date.now() + '.png', fullPage: true });
      await browser.close();
      return { success: false, method: 'password_field_not_found', currentUrl: page.url() };
    }
    await passInput.click();
    await delay(400);
    await passInput.type(password, { delay: TYPING_DELAY() });
    await delay(1000 + Math.random() * 1000);
    await page.keyboard.press('Enter');
    console.log('[AGENT] Mot de passe soumis (Entree), attente...');
    await delay(6000 + Math.random() * 3000);`;

if (c.includes(oldFlow)) {
  c = c.replace(oldFlow, newFlow);
  fs.writeFileSync('worker/google-auth-agent.js', c);
  console.log('Login flow updated successfully');
} else {
  console.log('Could not find exact old flow. Trying line-based approach...');
  const lines = c.split('\n');
  const out = [];
  let inOld = false;
  let skipUntil = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('// ETAPE EMAIL') && !inOld) {
      inOld = true;
      out.push(newFlow);
      // skip until we find the end of the old block (await delay(5000); after password submit)
      skipUntil = "await delay(5000);";
      continue;
    }
    if (inOld && line.trim() === skipUntil) {
      inOld = false;
      skipUntil = null;
      continue;
    }
    if (!inOld) out.push(line);
  }
  fs.writeFileSync('worker/google-auth-agent.js', out.join('\n'));
  console.log('Login flow updated via line skip');
}