import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import config from '../config.js';
import fs from 'fs';

// Apply stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());

export async function launchBrowser() {
  // Ensure profile directory exists
  fs.mkdirSync(config.profileDir, { recursive: true });

  const args = [
    `--load-extension=${config.extensionPath}`,
    `--disable-extensions-except=${config.extensionPath}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    `--window-size=${config.viewport.width},${config.viewport.height}`,
    // Disable infobars like "Chrome is being controlled by automated software"
    '--disable-infobars',
    // Disable background timer throttling (keeps extension active)
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ];

  const browser = await puppeteer.launch({
    executablePath: config.executablePath,
    headless: false, // Must be visible - real browser window
    userDataDir: config.profileDir,
    args,
    defaultViewport: null, // Use window size instead
    ignoreDefaultArgs: [
      '--enable-automation',
      '--disable-extensions',
    ],
  });

  // Wait for the AdNauseam extension background page to be ready
  const backgroundPage = await waitForExtensionBackground(browser);

  return { browser, backgroundPage };
}

async function waitForExtensionBackground(browser, timeout = 30000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const targets = browser.targets();
    const bgTarget = targets.find(
      t => t.type() === 'background_page' &&
        (t.url().includes('background.html') || t.url().includes('_generated_background_page'))
    );

    if (bgTarget) {
      const page = await bgTarget.page();
      // Wait for AdNauseam to be fully initialized
      await page.waitForFunction(() => {
        return typeof vAPI !== 'undefined' &&
          typeof vAPI.messaging !== 'undefined';
      }, { timeout: 15000 });
      console.log('[browser] Extension background page ready');
      return page;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  throw new Error('Timed out waiting for extension background page');
}

export async function getExtensionId(browser) {
  const targets = browser.targets();
  const bgTarget = targets.find(
    t => t.type() === 'background_page' &&
      (t.url().includes('background.html') || t.url().includes('_generated_background_page'))
  );
  if (bgTarget) {
    const url = new URL(bgTarget.url());
    return url.hostname; // Extension ID is the hostname in chrome-extension:// URLs
  }
  return null;
}
