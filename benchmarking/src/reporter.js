import fs from 'fs';
import path from 'path';
import config from '../config.js';

export class Reporter {
  constructor(scenario) {
    this.scenario = scenario;
    this.startTime = Date.now();
    this.environment = null;
  }

  setEnvironment(env) {
    this.environment = env;
  }

  /**
   * Save the full benchmark results to a JSON file.
   */
  save(results, pageVisits) {
    fs.mkdirSync(config.resultsDir, { recursive: true });

    const endTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `benchmark-${this.scenario}-${timestamp}.json`;
    const filepath = path.join(config.resultsDir, filename);

    const report = {
      meta: {
        scenario: this.scenario,
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        durationSeconds: Math.round((endTime - this.startTime) / 1000),
        ...this.environment,
      },
      pages: pageVisits,
      ads: results.summary,
      adsByDomain: this.summarizeDomains(results.adsByDomain),
      blocking: results.blockingStats,
      performance: {
        snapshots: results.snapshots,
        adGrowthOverTime: this.computeAdGrowth(results.snapshots),
      },
      allAds: results.allAds,
    };

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`\n[reporter] Results saved to: ${filepath}`);
    return filepath;
  }

  /**
   * Save a human-readable summary to a separate .txt file.
   */
  saveSummary(results, pageVisits) {
    fs.mkdirSync(config.resultsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `summary-${this.scenario}-${timestamp}.md`;
    const filepath = path.join(config.resultsDir, filename);

    const { summary } = results;
    const duration = Math.round((Date.now() - this.startTime) / 1000);
    const adsByDomain = results.adsByDomain || {};

    const domainRows = Object.entries(adsByDomain)
      .map(([domain, ads]) => ({ domain, ads: ads.length }))
      .sort((a, b) => b.ads - a.ads);

    const now = new Date();
    const lines = [];
    lines.push('# Benchmark Summary');
    lines.push('');
    lines.push(`**Date:** ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
    lines.push(`**Duration:** ${Math.floor(duration / 60)}m ${duration % 60}s`);
    lines.push(`**Pages visited:** ${pageVisits.length}`);
    lines.push('');
    lines.push('## Ads');
    lines.push('');
    lines.push(`| Metric | Count |`);
    lines.push(`|--------|------:|`);
    lines.push(`| Total detected | ${summary.totalAds} |`);
    lines.push(`| Image ads | ${summary.imageAds} |`);
    lines.push(`| Text ads | ${summary.textAds} |`);
    lines.push(`| Clicked | ${summary.clickedAds} |`);
    lines.push(`| Failed clicks | ${summary.failedClicks} |`);
    lines.push(`| Pending | ${summary.pendingAds} |`);
    lines.push(`| Click success | ${(summary.clickSuccessRate * 100).toFixed(1)}% |`);
    lines.push('');
    if (results.blockingStats) {
      lines.push('## Blocking');
      lines.push('');
      lines.push(`| Metric | Count |`);
      lines.push(`|--------|------:|`);
      lines.push(`| Requests blocked | ${results.blockingStats.requestStats.blockedCount} |`);
      lines.push(`| Requests allowed | ${results.blockingStats.requestStats.allowedCount} |`);
      lines.push('');
    }
    lines.push('## Ads per Site');
    lines.push('');
    lines.push('| Site | Ads |');
    lines.push('|------|----:|');
    for (const row of domainRows) {
      lines.push(`| ${row.domain} | ${row.ads} |`);
    }

    fs.writeFileSync(filepath, lines.join('\n') + '\n');
    console.log(`[reporter] Summary saved to: ${filepath}`);
    return filepath;
  }

  /**
   * Print a summary to the console.
   */
  printSummary(results, pageVisits) {
    const { summary } = results;
    const duration = Math.round((Date.now() - this.startTime) / 1000);

    console.log('\n' + '='.repeat(60));
    console.log('  BENCHMARK RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`  Scenario:          ${this.scenario}`);
    console.log(`  Duration:          ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`  Pages visited:     ${pageVisits.length}`);
    console.log('');
    console.log('  --- Ads ---');
    console.log(`  Total detected:    ${summary.totalAds}`);
    console.log(`    Image ads:       ${summary.imageAds}`);
    console.log(`    Text ads:        ${summary.textAds}`);
    console.log(`  Clicked:           ${summary.clickedAds}`);
    console.log(`  Failed clicks:     ${summary.failedClicks}`);
    console.log(`  Pending:           ${summary.pendingAds}`);
    console.log(`  Click success:     ${(summary.clickSuccessRate * 100).toFixed(1)}%`);
    console.log('');
    console.log('  --- Blocking ---');
    if (results.blockingStats) {
      console.log(`  Requests blocked:  ${results.blockingStats.requestStats.blockedCount}`);
      console.log(`  Requests allowed:  ${results.blockingStats.requestStats.allowedCount}`);
    }
    console.log('');
    console.log('  --- Top Domains by Ads ---');
    const domains = this.summarizeDomains(results.adsByDomain);
    domains.slice(0, 5).forEach(d => {
      console.log(`    ${d.domain}: ${d.count} ads`);
    });
    console.log('='.repeat(60) + '\n');
  }

  summarizeDomains(adsByDomain) {
    if (!adsByDomain) return [];
    return Object.entries(adsByDomain)
      .map(([domain, ads]) => ({ domain, count: ads.length }))
      .sort((a, b) => b.count - a.count);
  }

  computeAdGrowth(snapshots) {
    if (!snapshots || snapshots.length < 2) return [];
    return snapshots.map((s, i) => ({
      timestamp: s.timestamp,
      adCount: s.adCount,
      delta: i > 0 ? s.adCount - snapshots[i - 1].adCount : 0,
    }));
  }
}
