// Does a topDomains rule catch a request made from a cross-origin iframe nested in the strict site?
import path from 'node:path';
import { launch, sleep } from './cdp.mjs';
const here = path.dirname(new URL(import.meta.url).pathname);
const b = await launch(path.resolve(here, '../../dist/build/ADNLite.chromium.ubol-filters'), path.resolve(here, '../../dist/build/mv3-strict-parity/profile-nested'));
await sleep(8000);
const sw = await b.swSession();
const addRule = cond => b.evaluate(sw.sessionId, `chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [900778], addRules: [{ id: 900778, priority: 50, action: { type: 'block' }, condition: ${JSON.stringify(cond)} }] })`);
const childSessions = [];
b.listeners.push(m => { if (m.method === 'Target.attachedToTarget' && m.params.targetInfo.type === 'iframe') childSessions.push(m.params.sessionId); });
const run = async top => {
    childSessions.length = 0;
    const page = await b.newPage('about:blank');
    await b.send('Page.enable', {}, page.sessionId);
    await b.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, page.sessionId);
    await b.send('Page.navigate', { url: top }, page.sessionId); await sleep(3000);
    await b.evaluate(page.sessionId, `(() => { const f = document.createElement('iframe'); f.src = 'https://example.net/'; document.body.append(f); })()`);
    await sleep(4000);
    if (childSessions.length === 0) return 'no cross-origin iframe session';
    return b.evaluate(childSessions[0], `fetch('https://www.iana.org/favicon.ico', { mode: 'no-cors' }).then(() => 'LOADED', () => 'BLOCKED') .then(r => location.hostname + ' iframe -> ' + r)`);
};
await addRule({ initiatorDomains: ['example.com'], requestDomains: ['iana.org'] });
console.log('initiatorDomains rule (today\'s strict), top example.com:', await run('https://example.com/'));
await addRule({ topDomains: ['example.com'], requestDomains: ['iana.org'] });
console.log('topDomains rule,                        top example.com:', await run('https://example.com/'));
console.log('topDomains rule,                        top example.org:', await run('https://example.org/'));
b.close(); process.exit(0);
