import config from '../config.js';

const { behavior } = config;

// --- Utility functions ---

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

// Gaussian random using Box-Muller transform
function gaussianRandom(mean, stddev) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z * stddev + mean;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// --- Human behavior primitives ---

/**
 * Simulate human-like scrolling on the page.
 * Scrolls down with variable speed and pauses, occasionally scrolls up.
 */
export async function humanScroll(page, options = {}) {
  const { maxScrolls = 10, scrollDownProbability = 0.85 } = options;
  const scrollCount = randomInt(3, maxScrolls);

  for (let i = 0; i < scrollCount; i++) {
    const direction = Math.random() < scrollDownProbability ? 1 : -1;
    const distance = randomInt(behavior.scrollStep.min, behavior.scrollStep.max) * direction;

    try {
      await page.evaluate((dist) => {
        window.scrollBy({ top: dist, behavior: 'smooth' });
      }, distance);
    } catch {
      // Page navigated or context destroyed mid-scroll
      return;
    }

    // Pause between scrolls (reading simulation)
    const pause = randomBetween(behavior.scrollPause.min, behavior.scrollPause.max);
    await sleep(pause);
  }
}

/**
 * Wait on a page simulating reading time.
 * Uses gaussian distribution around the configured mean.
 */
export async function humanDwell(page) {
  const { min, max, mean } = behavior.dwellTime;
  const stddev = (max - min) / 4;
  const seconds = clamp(gaussianRandom(mean, stddev), min, max);
  console.log(`[human] Dwelling for ${Math.round(seconds)}s`);
  await sleep(seconds * 1000);
}

/**
 * Wait between page navigations.
 */
export async function humanPause() {
  const seconds = randomBetween(behavior.betweenPages.min, behavior.betweenPages.max);
  await sleep(seconds * 1000);
}
