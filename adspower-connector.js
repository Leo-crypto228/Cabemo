/**
 * CONNECTEUR ADSPOWER
 * Lance un profil Adspower et se connecte via Puppeteer
 */
const fetch = require('node-fetch');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const ADSPOWER_API = 'http://localhost:50325';

async function getApiKey() {
  // L'utilisateur doit fournir sa clé API Adspower
  return process.env.ADSPOWER_API_KEY || null;
}

async function listProfiles(apiKey) {
  const res = await fetch(`${ADSPOWER_API}/api/v1/user/list?page=1&page_size=100`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const data = await res.json();
  return data.data?.list || [];
}

async function startProfile(apiKey, userId) {
  // userId = ID du profil Adspower (PAS l'ID Supabase)
  const res = await fetch(`${ADSPOWER_API}/api/v1/browser/start?user_id=${userId}&api_key=${apiKey}&headless=0`, {
    method: 'GET'
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Adspower error: ${data.msg}`);
  }
  return data.data; // { ws, selenium, webdriver, debug_port, ... }
}

async function connectToAdspower(wsUrl) {
  const browser = await puppeteer.connect({
    browserWSEndpoint: wsUrl,
    defaultViewport: null
  });
  return browser;
}

module.exports = { listProfiles, startProfile, connectToAdspower, getApiKey };