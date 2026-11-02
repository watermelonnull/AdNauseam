import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  // Path to ungoogled Chromium executable
  executablePath: '/Applications/Chromium.app/Contents/MacOS/Chromium',

  // Persistent browser profile directory (accumulates history/cookies across runs)
  profileDir: path.resolve(__dirname, 'profiles/default'),

  // Path to built AdNauseam extension (dev build with production=0)
  extensionPath: path.resolve(__dirname, '../dist/build/adnauseam.chromium'),

  // Browser window settings
  viewport: { width: 1920, height: 1080 },

  // Human behavior tuning
  behavior: {
    // Time spent on each page (seconds) - gaussian around these values
    dwellTime: { min: 8, max: 40, mean: 15 },
    // Pause between page navigations (seconds)
    betweenPages: { min: 1, max: 4 },
    // Scroll speed (pixels per scroll step)
    scrollStep: { min: 400, max: 1000 },
    // Pause during scrolling (ms)
    scrollPause: { min: 100, max: 400 },
  },

  // Results output directory
  resultsDir: path.resolve(__dirname, 'results'),
};

export default config;
