/**
 * Extracts data from the AdNauseam extension background page.
 * Uses direct evaluation in the background page context to access
 * AdNauseam's internal state without needing external messaging.
 */

export class DataExtractor {
  constructor(backgroundPage) {
    this.bgPage = backgroundPage;
    this.snapshots = [];
  }

  /**
   * Get environment info: AdNauseam version, browser version, location.
   */
  async getEnvironment(browser) {
    const version = await browser.version();

    // Get AdNauseam version from the extension's manifest
    const adnVersion = await this.bgPage.evaluate(() => {
      try {
        return chrome.runtime.getManifest().version;
      } catch { return 'unknown'; }
    });

    // Get location via IP geolocation (free API, no key needed)
    let location = null;
    const tempPage = await browser.newPage();
    try {
      await tempPage.goto('https://ipinfo.io/json', { waitUntil: 'domcontentloaded', timeout: 10000 });
      location = await tempPage.evaluate(() => {
        try { return JSON.parse(document.body.innerText); }
        catch { return null; }
      });
    } catch { /* location will be null */ }
    await tempPage.close();

    return {
      adnauseamVersion: adnVersion,
      browser: version,
      location: location ? {
        ip: location.ip,
        city: location.city,
        region: location.region,
        country: location.country,
        timezone: location.timezone,
      } : { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    };
  }

  /**
   * Get the full export of all collected ads.
   */
  async exportAds() {
    return await this.bgPage.evaluate(() => {
      const adnauseam = self.adnauseam;
      if (!adnauseam || typeof adnauseam.exportAds !== 'function') {
        return null;
      }
      return adnauseam.exportAds({ sanitize: false });
    });
  }

  /**
   * Get structured data for vault display (ads + prefs + current visit).
   */
  async getVaultData() {
    return await this.bgPage.evaluate(() => {
      const adnauseam = self.adnauseam;
      if (!adnauseam || typeof adnauseam.adsForVault !== 'function') {
        return null;
      }
      return adnauseam.adsForVault({});
    });
  }

  /**
   * Get the total ad count.
   */
  async getAdCount() {
    return await this.bgPage.evaluate(() => {
      const adnauseam = self.adnauseam;
      if (!adnauseam) return 0;
      // adCount is internal, but we can get it from adsForVault
      const data = adnauseam.adsForVault({});
      return data && data.data ? data.data.length : 0;
    });
  }

  /**
   * Get ads for a specific page URL.
   */
  async getAdsForPage(pageUrl) {
    return await this.bgPage.evaluate((url) => {
      const adnauseam = self.adnauseam;
      if (!adnauseam || typeof adnauseam.adsForPage !== 'function') {
        return null;
      }
      return adnauseam.adsForPage({ tabId: null, pageUrl: url });
    }, pageUrl);
  }

  /**
   * Get blocking/request statistics from µBlock.
   */
  async getBlockingStats() {
    return await this.bgPage.evaluate(() => {
      const µb = self.µBlock;
      if (!µb) return null;

      return {
        requestStats: {
          blockedCount: µb.requestStats ? µb.requestStats.blockedCount : 0,
          allowedCount: µb.requestStats ? µb.requestStats.allowedCount : 0,
        },
        activeTabCount: µb.pageStores ? µb.pageStores.size : 0,
      };
    });
  }

  /**
   * Get page performance metrics for the active browsing tab.
   */
  async getPageMetrics(page) {
    try {
      const metrics = await page.metrics();
      const timing = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        if (!perf) return null;
        return {
          domContentLoaded: perf.domContentLoadedEventEnd - perf.startTime,
          loadComplete: perf.loadEventEnd - perf.startTime,
          domInteractive: perf.domInteractive - perf.startTime,
          ttfb: perf.responseStart - perf.startTime,
        };
      });

      return {
        jsHeapUsedSize: metrics.JSHeapUsedSize,
        jsHeapTotalSize: metrics.JSHeapTotalSize,
        timing,
      };
    } catch {
      return null;
    }
  }

  /**
   * Take a full snapshot of AdNauseam state.
   * Call periodically during the benchmark session.
   */
  async takeSnapshot() {
    const timestamp = Date.now();
    const adCount = await this.getAdCount();
    const blockingStats = await this.getBlockingStats();

    const snapshot = { timestamp, adCount, blockingStats };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Get comprehensive final results at end of session.
   */
  async getFinalResults() {
    const adsJson = await this.exportAds();
    const vaultData = await this.getVaultData();
    const blockingStats = await this.getBlockingStats();

    let ads = [];
    if (adsJson) {
      try {
        ads = typeof adsJson === 'string' ? JSON.parse(adsJson) : adsJson;
      } catch {
        ads = [];
      }
    }

    // If we got vault data, use it as the source of truth
    if (vaultData && vaultData.data) {
      ads = vaultData.data;
    }

    const totalAds = ads.length;
    const imageAds = ads.filter(ad => ad.contentType === 'img').length;
    const textAds = ads.filter(ad => ad.contentType === 'text').length;
    const clickedAds = ads.filter(ad => ad.visitedTs > 0).length;
    const failedClicks = ads.filter(ad => ad.visitedTs < 0).length;
    const pendingAds = ads.filter(ad => !ad.visitedTs && !ad.noVisit).length;

    // Group ads by page domain
    const adsByDomain = {};
    for (const ad of ads) {
      const domain = ad.pageDomain || 'unknown';
      if (!adsByDomain[domain]) adsByDomain[domain] = [];
      adsByDomain[domain].push(ad);
    }

    return {
      summary: {
        totalAds,
        imageAds,
        textAds,
        clickedAds,
        failedClicks,
        pendingAds,
        clickSuccessRate: clickedAds > 0 ? clickedAds / (clickedAds + failedClicks) : 0,
      },
      blockingStats,
      adsByDomain,
      allAds: ads,
      snapshots: this.snapshots,
      prefs: vaultData ? vaultData.prefs : null,
    };
  }
}
