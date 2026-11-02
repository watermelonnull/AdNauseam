import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchBrowser } from './browser.js';
import { DataExtractor } from './dataExtractor.js';
import { Reporter } from './reporter.js';
import { setupAutoDismiss } from './cookieConsent.js';
import { initLogger, attachPageLogger, attachBackgroundLogger, closeLogger } from './logger.js';
import { humanScroll, humanDwell, humanPause } from './humanBehavior.js';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, '../script.json');

async function main() {
  const steps = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf-8'));

  const logFile = initLogger('script');

  console.log('[main] AdNauseam Benchmark');
  console.log(`[main] Script: ${steps.length} sites`);
  console.log(`[main] Log file: ${logFile}`);
  console.log('');

  // Launch browser with extension
  console.log('[main] Launching browser...');
  const { browser, backgroundPage } = await launchBrowser();
  attachBackgroundLogger(backgroundPage);

  // Data extraction
  const extractor = new DataExtractor(backgroundPage);
  const reporter = new Reporter('script');
  const pageVisits = [];

  const env = await extractor.getEnvironment(browser);
  reporter.setEnvironment(env);
  console.log(`[main] AdNauseam v${env.adnauseamVersion} | ${env.browser}`);

  // Clear the vault before starting
  await backgroundPage.evaluate(() => {
    const adnauseam = self.adnauseam;
    if (adnauseam && typeof adnauseam.clearAds === 'function') {
      adnauseam.clearAds();
    }
  });
  console.log('[main] Vault cleared');
  console.log('');

  // Get browsing tab
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  setupAutoDismiss(page);
  attachPageLogger(page, 'tab');

  // Track page visits
  page.on('framenavigated', async (frame) => {
    if (frame === page.mainFrame()) {
      const url = frame.url();
      if (url && url.startsWith('http')) {
        pageVisits.push({ url, timestamp: Date.now(), title: await page.title().catch(() => '') });
      }
    }
  });

  // Run the script
  for (const step of steps) {
    const { url, stay = 10 } = step;

    console.log(`\n→ ${url} (${stay}s)`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      console.log(`  ⚠ Failed to load: ${e.message}`);
      await humanPause();
      continue;
    }

    // Wait for consent banners then dismiss
    await new Promise(r => setTimeout(r, 2000));

    await humanScroll(page);
    await humanDwell(page);

    // Respect the "stay" time (minus what we already spent scrolling/dwelling)
    const remaining = Math.max(0, stay * 1000 - (Date.now() - (pageVisits.at(-1)?.timestamp || Date.now())));
    if (remaining > 0) await new Promise(r => setTimeout(r, remaining));

    await humanPause();
  }

  // Collect final results
  console.log('\n[main] Collecting final results...');
  await extractor.takeSnapshot();
  const results = await extractor.getFinalResults();

  // Report
  reporter.printSummary(results, pageVisits);
  const filepath = reporter.save(results, pageVisits);
  reporter.saveSummary(results, pageVisits);

  // Close
  console.log('[main] Closing browser...');
  await browser.close();
  console.log(`[main] Done. Results: ${filepath}`);

  const finalLogPath = closeLogger();
  process.stdout.write(`[main] Log saved to: ${finalLogPath}\n`);
}

main().catch(e => {
  console.error('[main] Fatal error:', e);
  process.exit(1);
});
