import fs from 'fs';
import path from 'path';
import config from '../config.js';

let logStream = null;
let logFilePath = null;

/**
 * Initialize logging to a .txt file. Call once at startup.
 * Returns the log file path.
 */
export function initLogger(scenario) {
  fs.mkdirSync(config.resultsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `benchmark-${scenario}-${timestamp}.log.txt`;
  logFilePath = path.join(config.resultsDir, filename);

  logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
  logStream.write(`=== AdNauseam Benchmark Log ===\n`);
  logStream.write(`Started: ${new Date().toISOString()}\n`);
  logStream.write(`Scenario: ${scenario}\n`);
  logStream.write(`${'='.repeat(50)}\n\n`);

  // Intercept console methods
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => {
    const line = formatLine('INFO', args);
    logStream.write(line + '\n');
    originalLog.apply(console, args);
  };

  console.error = (...args) => {
    const line = formatLine('ERROR', args);
    logStream.write(line + '\n');
    originalError.apply(console, args);
  };

  console.warn = (...args) => {
    const line = formatLine('WARN', args);
    logStream.write(line + '\n');
    originalWarn.apply(console, args);
  };

  // Capture unhandled errors
  process.on('uncaughtException', (err) => {
    const line = formatLine('FATAL', [`Uncaught exception: ${err.message}\n${err.stack}`]);
    logStream.write(line + '\n');
    originalError.call(console, '[FATAL]', err);
  });

  process.on('unhandledRejection', (reason) => {
    const line = formatLine('FATAL', [`Unhandled rejection: ${reason}`]);
    logStream.write(line + '\n');
    originalError.call(console, '[FATAL] Unhandled rejection:', reason);
  });

  return logFilePath;
}

/**
 * Attach browser console and error listeners to a page.
 * Captures JS errors, failed requests, and console output from the page.
 */
export function attachPageLogger(page, label = 'page') {
  page.on('console', (msg) => {
    const type = msg.type().toUpperCase();
    // Only log warnings and errors from browser (skip verbose info/debug)
    if (type === 'ERROR' || type === 'WARNING' || type === 'WARN') {
      writeToLog(`BROWSER:${label}`, `[${type}] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    writeToLog(`BROWSER:${label}`, `[PAGE_ERROR] ${err.message}`);
  });

  page.on('requestfailed', (req) => {
    const failure = req.failure();
    const reason = failure ? failure.errorText : 'unknown';
    // Skip common non-errors (aborted by extension, blocked by adblocker)
    if (reason === 'net::ERR_BLOCKED_BY_CLIENT' || reason === 'net::ERR_ABORTED') return;
    writeToLog(`BROWSER:${label}`, `[REQ_FAILED] ${req.url().slice(0, 120)} (${reason})`);
  });
}

/**
 * Attach logger to the extension background page.
 */
export function attachBackgroundLogger(bgPage) {
  bgPage.on('console', (msg) => {
    const type = msg.type().toUpperCase();
    const text = msg.text();
    // Log ADN-tagged messages and errors
    if (text.includes('[ADN]') || type === 'ERROR' || type === 'WARNING') {
      writeToLog('EXT:bg', `[${type}] ${text}`);
    }
  });

  bgPage.on('pageerror', (err) => {
    writeToLog('EXT:bg', `[ERROR] ${err.message}`);
  });
}

/**
 * Write a line directly to the log.
 */
export function writeToLog(source, message) {
  if (!logStream) return;
  const ts = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
  logStream.write(`[${ts}] [${source}] ${message}\n`);
}

/**
 * Close the log file. Call at the end of the session.
 */
export function closeLogger() {
  if (logStream) {
    logStream.write(`\n${'='.repeat(50)}\n`);
    logStream.write(`Ended: ${new Date().toISOString()}\n`);
    logStream.end();
    logStream = null;
  }
  return logFilePath;
}

function formatLine(level, args) {
  const ts = new Date().toISOString().slice(11, 23);
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  return `[${ts}] [${level}] ${msg}`;
}
