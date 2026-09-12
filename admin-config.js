const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_PATH = path.join(__dirname, 'admin-config.json');

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function hashPassword(pw, salt) {
  return crypto.pbkdf2Sync(pw, salt, 100000, 64, 'sha512').toString('hex');
}

function hasAdminPassword() {
  const cfg = loadConfig();
  return !!(cfg && cfg.passwordHash && cfg.salt);
}

function verifyAdminPassword(pw) {
  const cfg = loadConfig();
  if (!cfg || !cfg.salt || !cfg.passwordHash) return false;
  return hashPassword(pw, cfg.salt) === cfg.passwordHash;
}

function setAdminPassword(pw) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = hashPassword(pw, salt);
  saveConfig({ passwordHash: hash, salt, createdAt: new Date().toISOString() });
  return true;
}

module.exports = { hasAdminPassword, verifyAdminPassword, setAdminPassword };
