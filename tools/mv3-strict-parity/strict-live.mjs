// Live check of AdNauseam Lite strict mode, with real requests.
//
//   node strict-live.mjs
//
// Uses an ad request uBO Lite blocks and adn-allow lets load, issued from
// example.com (made strict), example.org (never strict) and a cross-origin
// iframe nested in example.com. Also checks a strict site survives a browser
// restart, and which toolbar icon each tab is given.

import path from 'node:path';
import { launch, sleep } from './cdp.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(here, '../..');
const extDir = `${repo}/dist/build/ADNLite.chromium`;
const profile = `${repo}/dist/build/mv3-strict-parity/profile-live`;
// Plainly blocked by uBO Lite whatever the request type. (Not adsbygoogle.js or
// gpt.js: those are redirected to a stub, which fetch() reports as loaded.)
const AD_URL = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';

let failures = 0;
const check = (name, got, want) => {
    const ok = got === want;
    if ( ok === false ) { failures += 1; }
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name.padEnd(62)} ${got}${ok ? '' : `   (expected ${want})`}`);
};

async function session(b, fn) {
    await sleep(10000);
    const sw = await b.swSession();
    const ext = await b.newPage(`${sw.origin}/dashboard.html`);
    await sleep(1500);
    const message = msg => b.evaluate(ext.sessionId, `chrome.runtime.sendMessage(${JSON.stringify(msg)})`);
    const state = async () => JSON.parse(await b.evaluate(sw.sessionId, `(async () => {
        const dnr = chrome.declarativeNetRequest;
        const strict = (await dnr.getDynamicRules()).filter(r => r.id >= 6000000 && r.id <= 6999999);
        return JSON.stringify({
            adnAllow: (await dnr.getEnabledRulesets()).includes('adn-allow'),
            strictRules: strict.length,
            topDomains: [ ...new Set(strict.flatMap(r => r.condition.topDomains || [ '(none)' ])) ].join(','),
            priorities: [ ...new Set(strict.map(r => r.priority)) ].sort().join(','),
            legacySessionRule: (await dnr.getSessionRules()).some(r => r.id === 900001),
        });
    })()`));
    // record which icon the extension gives to which tab
    await b.evaluate(sw.sessionId, `(() => {
        self.adnIconLog = [];
        const setIcon = chrome.action.setIcon.bind(chrome.action);
        chrome.action.setIcon = details => { self.adnIconLog.push({ tabId: details.tabId, strict: /strict/.test(JSON.stringify(details.path)) }); return setIcon(details); };
    })()`);
    const lastIcon = async tabId => JSON.parse(await b.evaluate(sw.sessionId, `JSON.stringify(self.adnIconLog.filter(e => e.tabId === ${tabId}).pop() ?? null)`));
    const tabIdOf = async url => b.evaluate(sw.sessionId, `chrome.tabs.query({}).then(tabs => tabs.find(t => (t.url || '').startsWith(${JSON.stringify(url)}))?.id ?? -1)`);

    const children = [];
    b.listeners.push(m => { if ( m.method === 'Target.attachedToTarget' && m.params.targetInfo.type === 'iframe' ) { children.push(m.params.sessionId); } });
    const fetchFrom = async (top, nested = false) => {
        children.length = 0;
        const page = await b.newPage('about:blank');
        await b.send('Page.enable', {}, page.sessionId);
        await b.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, page.sessionId);
        await b.send('Page.navigate', { url: top }, page.sessionId);
        await sleep(3500);
        let sid = page.sessionId;
        if ( nested ) {
            await b.evaluate(sid, `(() => { const f = document.createElement('iframe'); f.src = 'https://example.net/'; document.body.append(f); })()`);
            await sleep(3500);
            if ( children.length === 0 ) { return 'no iframe'; }
            sid = children[0];
        }
        return b.evaluate(sid, `fetch(${JSON.stringify(AD_URL)}, { mode: 'no-cors' }).then(() => 'LOADED', () => 'BLOCKED')`);
    };
    return fn({ message, state, fetchFrom, lastIcon, tabIdOf });
}

/******************************************************************************/

let b = await launch(extDir, profile);
await session(b, async t => {
    console.log('--- normal mode');
    check('ad request from example.com', await t.fetchFrom('https://example.com/'), 'LOADED');
    check('icon of the example.com tab', (await t.lastIcon(await t.tabIdOf('https://example.com')))?.strict ?? false, false);

    console.log('--- strict on example.com');
    const r = await t.message({ what: 'setAdnStrict', hostname: 'example.com', enabled: true });
    check('setAdnStrict reply', JSON.stringify(r), '{"success":true}');
    let s = await t.state();
    console.log(`      ${s.strictRules} dynamic strict rules, topDomains=${s.topDomains}, priorities=${s.priorities}`);
    check('strict rules registered', s.strictRules > 10000, true);
    check('scoped to the strict site only', s.topDomains, 'example.com');
    check('old 27-domain session rule gone', s.legacySessionRule, false);
    check('getAdnStrict example.com', JSON.stringify(await t.message({ what: 'getAdnStrict', hostname: 'example.com' })), '{"enabled":true}');
    check('existing example.com tab turned red', (await t.lastIcon(await t.tabIdOf('https://example.com')))?.strict, true);
    check('ad request from example.com', await t.fetchFrom('https://example.com/'), 'BLOCKED');
    check('ad request from an iframe nested in example.com', await t.fetchFrom('https://example.com/', true), 'BLOCKED');
    check('ad request from example.org (not strict)', await t.fetchFrom('https://example.org/'), 'LOADED');
    check('icon of the example.org tab', (await t.lastIcon(await t.tabIdOf('https://example.org')))?.strict ?? false, false);

    console.log('--- strict off again on example.com');
    await t.message({ what: 'setAdnStrict', hostname: 'example.com', enabled: false });
    s = await t.state();
    check('strict rules removed', s.strictRules, 0);
    check('ad request from example.com', await t.fetchFrom('https://example.com/'), 'LOADED');
    check('example.com tabs back to the normal icon', (await t.lastIcon(await t.tabIdOf('https://example.com')))?.strict, false);

    console.log('--- strict on example.com again, then the browser is restarted');
    await t.message({ what: 'setAdnStrict', hostname: 'example.com', enabled: true });
});
await b.quit();

b = await launch(extDir, profile, [], { keepProfile: true });
await session(b, async t => {
    let s = await t.state();
    check('strict rules still registered after restart', s.strictRules > 10000, true);
    check('still scoped to the strict site only', s.topDomains, 'example.com');
    check('ad request from example.com', await t.fetchFrom('https://example.com/'), 'BLOCKED');
    check('icon of the example.com tab', (await t.lastIcon(await t.tabIdOf('https://example.com')))?.strict, true);
    check('ad request from example.org (not strict)', await t.fetchFrom('https://example.org/'), 'LOADED');
    await t.message({ what: 'setAdnStrict', hostname: 'example.com', enabled: false });
    s = await t.state();
    check('strict rules removed', s.strictRules, 0);
    check('adn-allow ruleset enabled', s.adnAllow, true);
});
b.close();
console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
