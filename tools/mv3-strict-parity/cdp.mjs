// Minimal CDP driver for a headless Chromium with one unpacked extension.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launch(extDir, profile, extraArgs = [], { keepProfile = false } = {}) {
    if ( keepProfile === false ) { fs.rmSync(profile, { recursive: true, force: true }); }
    fs.rmSync(path.join(profile, 'DevToolsActivePort'), { force: true }); // stale when the profile is kept
    const args = ['--headless=new', `--user-data-dir=${profile}`, '--remote-debugging-port=0',
        '--no-first-run', '--no-default-browser-check', '--window-size=1440,1000',
        '--disable-features=DisableLoadExtensionCommandLineSwitch', ...extraArgs];
    if (extDir) args.push(`--load-extension=${extDir}`);
    args.push('about:blank');
    const child = spawn('/Applications/Chromium.app/Contents/MacOS/Chromium', args, { stdio: 'ignore' });
    process.on('exit', () => { try { child.kill('SIGKILL'); } catch { } });
    let port;
    for (let i = 0; i < 150 && !port; i++) {
        await sleep(200);
        try { port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch { }
    }
    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));
    let nextId = 1;
    const pending = new Map();
    const listeners = [];
    ws.addEventListener('message', ev => {
        const m = JSON.parse(ev.data);
        if (m.id && pending.has(m.id)) {
            const p = pending.get(m.id); pending.delete(m.id);
            m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
        } else if (m.method) { for (const l of listeners) l(m); }
    });
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
    const evaluate = async (sessionId, expression) => {
        const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
        return r.result.value;
    };
    // session attached to the extension's service worker
    const swSession = async () => {
        for (let i = 0; i < 100; i++) {
            const sw = (await send('Target.getTargets')).targetInfos.find(t => t.type === 'service_worker' && t.url.startsWith('chrome-extension://'));
            if (sw) { const { sessionId } = await send('Target.attachToTarget', { targetId: sw.targetId, flatten: true }); return { sessionId, origin: 'chrome-extension://' + new URL(sw.url).host }; }
            await sleep(200);
        }
        throw new Error('no extension service worker');
    };
    const newPage = async url => {
        const { targetId } = await send('Target.createTarget', { url });
        const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
        return { targetId, sessionId };
    };
    const close = () => { try { ws.close(); } catch { } try { child.kill('SIGKILL'); } catch { } };
    const quit = async () => { await send('Browser.close').catch(() => {}); await new Promise(r => child.once('exit', r)); };
    return { send, evaluate, listeners, swSession, newPage, close, quit };
}
