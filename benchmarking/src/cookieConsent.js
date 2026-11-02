/**
 * Automatically dismisses cookie/GDPR consent banners.
 * Finds visible buttons whose text matches common "accept" words in multiple languages.
 */

const ACCEPT_WORDS = [
  // English
  'accept', 'accept all', 'accept cookies', 'agree', 'i agree', 'allow', 'allow all',
  'allow cookies', 'got it', 'ok', 'okay', 'i understand', 'consent',
  // German
  'akzeptieren', 'alle akzeptieren', 'zustimmen', 'einverstanden',
  // French
  'accepter', 'tout accepter', "j'accepte", 'autoriser',
  // Spanish
  'aceptar', 'aceptar todo', 'aceptar todas',
  // Portuguese
  'aceitar', 'aceitar tudo', 'aceito',
  // Italian
  'accetta', 'accetta tutti', 'accetto',
  // Japanese
  '同意する', '同意',
  // Dutch
  'accepteren', 'alles accepteren',
];

export async function dismissConsent(page) {
  try {
    const clicked = await page.evaluate((words) => {
      const buttons = document.querySelectorAll('button, [role="button"], a[role="button"], input[type="submit"]');
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text.length > 60) continue;

        const rect = btn.getBoundingClientRect();
        const style = window.getComputedStyle(btn);
        const visible = rect.width > 0 && rect.height > 0 &&
          style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        if (!visible) continue;

        // Skip reject/manage/settings buttons
        if (/reject|decline|manage|settings|preferences|customize|ablehnen|refuser|rechazar/i.test(text)) continue;

        if (words.some(w => text === w || text.startsWith(w))) {
          btn.click();
          return text.slice(0, 50);
        }
      }
      return null;
    }, ACCEPT_WORDS);

    if (clicked) {
      console.log(`[consent] Clicked: "${clicked}"`);
      return true;
    }

    // Also check iframes (CMPs like SourcePoint, OneTrust, etc.)
    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) continue;
      try {
        const iframeClicked = await frame.evaluate((words) => {
          const buttons = document.querySelectorAll('button, [role="button"]');
          for (const btn of buttons) {
            const text = btn.textContent.trim().toLowerCase();
            if (text.length > 60) continue;
            if (words.some(w => text === w || text.startsWith(w))) {
              btn.click();
              return text.slice(0, 50);
            }
          }
          return null;
        }, ACCEPT_WORDS).catch(() => null);

        if (iframeClicked) {
          console.log(`[consent] Clicked in iframe: "${iframeClicked}"`);
          return true;
        }
      } catch { /* frame detached */ }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Auto-dismiss consent banners after every page load.
 */
export function setupAutoDismiss(page) {
  page.on('load', async () => {
    await new Promise(r => setTimeout(r, 1500));
    await dismissConsent(page);
    // Retry — some banners render late
    await new Promise(r => setTimeout(r, 2000));
    await dismissConsent(page);
  });
}
