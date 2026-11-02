// Strict-mode parity test for AdNauseam Lite (MV3).
//
// Strict mode on a site must block what uBO Lite blocks there. This captures the
// real requests a page makes (with ads loading), then asks Chromium's DNR engine,
// request by request, what happens under:
//   ref     uBO Lite rulesets           (dist/build/ADNLite.chromium.ubol-filters)
//   strict  AdNauseam Lite, strict ON   (dist/build/ADNLite.chromium)
//   normal  AdNauseam Lite, strict OFF  (shown for context)
// A "leak" is a request ref stops (block/redirect) that strict lets load.
// Exit code 1 when there are leaks.
//
//   node strict-parity.mjs <url> [--corpus file.json] [--wait 25] [--adn dir] [--ref dir]
//   --no-adn-allow   "strict" run = adn-allow ruleset switched off (global strict)
//
// --corpus reuses a saved capture (written to dist/build/mv3-strict-parity on every capture),
// which makes a run fully repeatable. Needs Node >= 22 and /Applications/Chromium.app.

import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep } from './cdp.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i === -1 ? dflt : argv.splice(i, 2)[1]; };
const repo = opt('repo', path.resolve(here, '../..'));
const adnDir = opt('adn', `${repo}/dist/build/ADNLite.chromium`);
const refDir = opt('ref', `${repo}/dist/build/ADNLite.chromium.ubol-filters`);
const waitS = Number(opt('wait', '25'));
let corpusFile = opt('corpus', '');
const noAdnAllow = argv.includes('--no-adn-allow') && argv.splice(argv.indexOf('--no-adn-allow'), 1).length === 1; // strict run = adn-allow ruleset disabled
const outDir = path.join(repo, 'dist/build/mv3-strict-parity');
fs.mkdirSync(outDir, { recursive: true });
const pageURL = argv[0];
if ( !pageURL ) { console.error('usage: node strict-parity.mjs <url> [--corpus file.json]'); process.exit(2); }
const site = new URL(pageURL).hostname;

/******************************************************************************/
// 1. Capture

const dnrTypeFromCDP = {
    Stylesheet: 'stylesheet', Image: 'image', Media: 'media', Font: 'font', Script: 'script',
    XHR: 'xmlhttprequest', Fetch: 'xmlhttprequest', EventSource: 'xmlhttprequest',
    Ping: 'ping', WebSocket: 'websocket', CSPViolationReport: 'csp_report',
};

async function capture() {
    const b = await launch(adnDir, path.join(outDir, 'profile-capture'));
    await sleep(10000); // rulesets + content scripts get registered
    const page = await b.newPage('about:blank');
    const frames = new Map(); // frameId -> { url, parentId }
    const seen = new Map();
    const watch = async sid => {
        await b.send('Page.enable', {}, sid).catch(() => {});
        await b.send('Network.enable', {}, sid).catch(() => {});
        await b.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sid).catch(() => {});
    };
    const originOf = u => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.origin : ''; } catch { return ''; } };
    b.listeners.push(m => {
        if ( m.method === 'Target.attachedToTarget' ) { watch(m.params.sessionId); return; }
        if ( m.method === 'Page.frameAttached' ) {
            const f = frames.get(m.params.frameId) || {};
            frames.set(m.params.frameId, { ...f, parentId: m.params.parentFrameId });
            return;
        }
        if ( m.method === 'Page.frameNavigated' ) {
            const { id, parentId, url } = m.params.frame;
            frames.set(id, { url, parentId: parentId ?? frames.get(id)?.parentId });
            return;
        }
        if ( m.method !== 'Network.requestWillBeSent' ) { return; }
        const { request, type, frameId, documentURL } = m.params;
        if ( /^https?:/.test(request.url) === false ) { return; }
        let dnrType = dnrTypeFromCDP[type] || 'other';
        let initiator = originOf(documentURL);
        if ( type === 'Document' ) {
            const parentId = frames.get(frameId)?.parentId;
            if ( parentId === undefined ) { return; } // main frame
            dnrType = 'sub_frame';
            initiator = originOf(frames.get(parentId)?.url) || originOf(pageURL);
        }
        if ( initiator === '' ) { initiator = originOf(pageURL); }
        const key = `${dnrType} ${initiator} ${request.url}`;
        if ( seen.has(key) === false ) { seen.set(key, { url: request.url, type: dnrType, initiator }); }
    });
    await watch(page.sessionId);
    await b.send('Page.navigate', { url: pageURL }, page.sessionId);
    await sleep(waitS * 400);
    // best effort: accept a consent dialog so consent-gated ads load too
    const consent = await b.evaluate(page.sessionId, `(() => {
        const b = [...document.querySelectorAll('button, [role="button"], a')].find(b => /^\\s*(i\\s+)?(accept|agree|allow)( all)?( cookies)?\\s*$/i.test(b.textContent || ''));
        if ( !b ) { return 'no consent button found'; } b.click(); return 'clicked "' + b.textContent.trim() + '"';
    })()`).catch(e => `consent click failed: ${e.message}`);
    await sleep(waitS * 600);
    b.close();
    return { pageURL, capturedAt: new Date().toISOString(), consent, requests: [...seen.values()] };
}

/******************************************************************************/
// 2. Replay

function ruleLookup(extDir) {
    const cache = new Map();
    return (rulesetId, ruleId) => {
        if ( cache.has(rulesetId) === false ) {
            const byId = new Map();
            for ( const sub of [ 'main', 'regex' ] ) {
                const p = path.join(extDir, 'rulesets', sub, `${rulesetId}.json`);
                if ( fs.existsSync(p) === false ) { continue; }
                for ( const r of JSON.parse(fs.readFileSync(p, 'utf8')) ) { byId.set(r.id, r); }
            }
            cache.set(rulesetId, byId);
        }
        return cache.get(rulesetId).get(ruleId);
    };
}

async function replay(label, extDir, requests, { strict = false, disable = [] } = {}) {
    const b = await launch(extDir, path.join(outDir, `profile-${label}`));
    await sleep(10000);
    const sw = await b.swSession();
    if ( strict ) {
        const page = await b.newPage(`${sw.origin}/dashboard.html`);
        await sleep(1500);
        await b.evaluate(page.sessionId, `chrome.runtime.sendMessage({ what: 'setAdnStrict', hostname: ${JSON.stringify(site)}, enabled: true })`);
    }
    if ( disable.length !== 0 ) {
        await b.evaluate(sw.sessionId, `chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: ${JSON.stringify(disable)} })`);
    }
    const raw = JSON.parse(await b.evaluate(sw.sessionId, `(async () => {
        const dnr = chrome.declarativeNetRequest;
        const out = { enabled: await dnr.getEnabledRulesets(), matches: [], asTop: [], local: {} };
        for ( const r of [ ...await dnr.getSessionRules(), ...await dnr.getDynamicRules() ] ) { out.local[r.id] = { type: r.action.type, priority: r.priority, top: (r.condition.topDomains || []).length !== 0 }; }
        for ( const q of ${JSON.stringify(requests)} ) {
            const r = await dnr.testMatchOutcome(q).catch(e => ({ error: e.message, matchedRules: [] }));
            out.matches.push(r.matchedRules);
            const nested = q.initiator !== ${JSON.stringify(new URL(pageURL).origin)};
            out.asTop.push(nested ? (await dnr.testMatchOutcome({ ...q, initiator: ${JSON.stringify(new URL(pageURL).origin)} }).catch(() => ({ matchedRules: [] }))).matchedRules : null);
        }
        return JSON.stringify(out);
    })()`));
    b.close();
    const lookup = ruleLookup(extDir);
    const outcomeOf = matched => {
        for ( const m of matched ) {
            const local = m.rulesetId.startsWith('_');
            const action = local ? raw.local[m.ruleId]?.type : lookup(m.rulesetId, m.ruleId)?.action?.type;
            if ( action === 'modifyHeaders' ) { continue; }
            return { action: action || 'unknown', by: `${m.rulesetId}#${m.ruleId}`, top: local && raw.local[m.ruleId]?.top === true };
        }
        return { action: 'none', by: '' };
    };
    // testMatchOutcome() takes the initiator as the top site, so a rule scoped
    // with topDomains can never match a request from a nested frame. Such a
    // request is judged again with the page as initiator, and only counts when
    // the winner is a top-scoped rule. (Real nested frames: see strict-live.mjs.)
    const outcomes = raw.matches.map((matched, i) => {
        const o = outcomeOf(matched);
        if ( stops(o) || raw.asTop[i] === null ) { return o; }
        const asTop = outcomeOf(raw.asTop[i]);
        return stops(asTop) && asTop.top ? { ...asTop, nested: true } : o;
    });
    return { enabled: raw.enabled, outcomes };
}

const stops = o => o.action === 'block' || o.action === 'redirect';

/******************************************************************************/

let corpus;
if ( corpusFile ) {
    corpus = JSON.parse(fs.readFileSync(corpusFile, 'utf8'));
    console.log(`corpus: ${corpus.requests.length} requests from ${corpusFile} (captured ${corpus.capturedAt})`);
} else {
    console.log(`capturing ${pageURL} with AdNauseam Lite, strict off, ${waitS}s ...`);
    corpus = await capture();
    corpusFile = path.join(outDir, `corpus-${site}.json`);
    fs.writeFileSync(corpusFile, JSON.stringify(corpus, null, 1));
    console.log(`corpus: ${corpus.requests.length} requests (consent: ${corpus.consent}) -> ${corpusFile}`);
}
const reqs = corpus.requests;

const [ ref, strict, normal ] = await Promise.all([
    replay('ref', refDir, reqs),
    replay('strict', adnDir, reqs, noAdnAllow ? { disable: [ 'adn-allow' ] } : { strict: true }),
    replay('normal', adnDir, reqs),
]);

const hostOf = u => new URL(u).hostname;
const thirdParty = reqs.filter(r => hostOf(r.url).endsWith(site.split('.').slice(-2).join('.')) === false).length;
const refStops = reqs.filter((_, i) => stops(ref.outcomes[i]));
const leaks = [], over = [];
reqs.forEach((r, i) => {
    if ( stops(ref.outcomes[i]) && stops(strict.outcomes[i]) === false ) { leaks.push({ ...r, ref: ref.outcomes[i], adn: strict.outcomes[i] }); }
    if ( stops(ref.outcomes[i]) === false && stops(strict.outcomes[i]) ) { over.push({ ...r, ref: ref.outcomes[i], adn: strict.outcomes[i] }); }
});
const normalStops = reqs.filter((_, i) => stops(ref.outcomes[i]) && stops(normal.outcomes[i])).length;

console.log(`\nsite: ${site}   requests: ${reqs.length} (${thirdParty} third-party)${noAdnAllow ? '   [strict = adn-allow ruleset disabled]' : ''}`);
console.log(`uBO Lite stops:                      ${refStops.length}`);
console.log(`  of those, AdNauseam normal stops:  ${normalStops}`);
console.log(`  of those, AdNauseam STRICT stops:  ${refStops.length - leaks.length}   -> parity ${(100 * (refStops.length - leaks.length) / Math.max(refStops.length, 1)).toFixed(1)}%`);
const nestedN = reqs.filter((_, i) => stops(ref.outcomes[i]) && strict.outcomes[i].nested).length;
if ( nestedN !== 0 ) { console.log(`  (${nestedN} of them from nested frames, judged with the page as initiator: top-scoped rules)`); }
console.log(`LEAKS (uBO Lite stops, strict loads): ${leaks.length}`);
const group = (list, keyFn) => { const g = new Map(); for ( const x of list ) { const k = keyFn(x); g.set(k, [ ...(g.get(k) || []), x ]); } return [ ...g ].sort((a, b) => b[1].length - a[1].length); };
for ( const [ host, list ] of group(leaks, x => hostOf(x.url)) ) {
    const froms = [ ...new Set(list.map(x => hostOf(x.initiator))) ].slice(0, 3).join(', ');
    const winners = [ ...new Set(list.map(x => x.adn.by || 'no rule')) ].slice(0, 3).join(', ');
    console.log(`  ${String(list.length).padStart(4)}  ${host.padEnd(44)} from ${froms.padEnd(40)} strict winner: ${winners}`);
}
console.log(`EXTRA (strict stops, uBO Lite loads): ${over.length}`);
for ( const [ by, list ] of group(over, x => x.adn.by.replace(/#.*/, '')) ) {
    console.log(`  ${String(list.length).padStart(4)}  by ruleset "${by}"  e.g. ${list[0].url.slice(0, 90)}`);
}
fs.writeFileSync(path.join(outDir, `report-${site}.json`), JSON.stringify({ leaks, over }, null, 1));
process.exit(leaks.length === 0 ? 0 : 1);
