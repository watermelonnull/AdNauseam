import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import config from './config.js';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

puppeteer.use(StealthPlugin());

const PREFS_PATH = path.join(config.profileDir, 'Default', 'Preferences');
const ADN_CONFIG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'adn_config.json'
);
const SCRIPT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'script.json'
);

/**
 * Pre-configure the profile Preferences before Chrome launches.
 * Chrome reads this on startup, so settings stick.
 */
function preconfigureProfile() {
  fs.mkdirSync(path.join(config.profileDir, 'Default'), { recursive: true });

  let prefs = {};
  try {
    prefs = JSON.parse(fs.readFileSync(PREFS_PATH, 'utf-8'));
  } catch {
    // First run — no prefs file yet
  }

  // Enable developer mode
  prefs.extensions = prefs.extensions ?? {};
  prefs.extensions.ui = prefs.extensions.ui ?? {};
  prefs.extensions.ui.developer_mode = true;

  fs.writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2));
  console.log('Pre-configured profile: developer mode ON');
}

async function restoreAdnConfig(browser, extensionId) {
  const userData = JSON.parse(fs.readFileSync(ADN_CONFIG_PATH, 'utf-8'));
  const dashboardUrl = `chrome-extension://${extensionId}/dashboard.html`;

  const page = await browser.newPage();
  await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' });

  // Wait for vAPI to be available, then send the restore message
  await page.waitForFunction(() =>
    typeof vAPI !== 'undefined' && typeof vAPI.messaging !== 'undefined',
    { timeout: 15000 }
  );

  await page.evaluate((data) => {
    return vAPI.messaging.send('dashboard', {
      what: 'restoreUserData',
      userData: data,
      file: 'adn_config.json'
    });
  }, userData);

  console.log('AdNauseam settings restored from adn_config.json');

  // Extension restarts after restore — wait for it to come back
  await new Promise(r => setTimeout(r, 3000));
  await page.close().catch(() => {});
}

async function runScript(browser) {
  const steps = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf-8'));
  const page = (await browser.pages())[0] || await browser.newPage();

  console.log(`Running script: ${steps.length} sites\n`);

  for (const { url, stay } of steps) {
    console.log(`→ ${url} (${stay}s)`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (err) {
      console.log(`  ⚠ navigation error: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, stay * 1000));
  }

  console.log('\nScript finished.');
}

async function main() {
  fs.mkdirSync(config.profileDir, { recursive: true });

  // Write preferences BEFORE Chrome starts so they take effect
  preconfigureProfile();

  const browser = await puppeteer.launch({
    executablePath: config.executablePath,
    headless: false,
    userDataDir: config.profileDir,
    args: [
      `--load-extension=${config.extensionPath}`,
      `--disable-extensions-except=${config.extensionPath}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      `--window-size=${config.viewport.width},${config.viewport.height}`,
    ],
    defaultViewport: null,
    ignoreDefaultArgs: ['--enable-automation', '--disable-extensions'],
  });

  console.log('Browser launched with AdNauseam extension.');
  console.log('Close the browser window to exit.\n');

  // Wait for extension background page
  let extensionId = null;
  const start = Date.now();
  while (Date.now() - start < 30000) {
    const targets = browser.targets();
    const bg = targets.find(
      t => t.type() === 'background_page' &&
        (t.url().includes('background.html') || t.url().includes('_generated_background_page'))
    );
    if (bg) {
      const match = bg.url().match(/chrome-extension:\/\/([^/]+)/);
      extensionId = match?.[1] ?? null;
      console.log(`AdNauseam extension loaded! ID: ${extensionId ?? 'unknown'}`);
      console.log(`Dashboard: chrome-extension://${extensionId}/dashboard.html`);
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // Restore AdNauseam settings from adn_config.json
  if (extensionId && fs.existsSync(ADN_CONFIG_PATH)) {
    await restoreAdnConfig(browser, extensionId);
  }

  // Run the browsing script
  if (fs.existsSync(SCRIPT_PATH)) {
    await runScript(browser);
  }

  browser.on('disconnected', () => {
    console.log('Browser closed.');
    process.exit(0);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
