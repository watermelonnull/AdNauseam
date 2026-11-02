{
    const whitelisted = document.currentScript.dataset.whitelisted === 'true';
    const deferBootstrap = document.currentScript.dataset.deferBootstrap === 'true';
    let onError;
    window.testAds = [];
    window.testErrors = [];
    const recordError = error => {
        window.testErrors.push(String(error));
        onError?.(error);
    };
    window.addEventListener('error', event => recordError(event.error || event.message));
    window.addEventListener('unhandledrejection', event => {
        recordError(event.reason);
    });
    window.chrome = { extension: { inIncognitoContext: false } };
    window.vAPI = {
        prefs: { logEvents: false, textAdsDisabled: false },
        setTimeout: window.setTimeout.bind(window),
        randomToken: () => `adn${Math.random().toString(36).slice(2)}`,
        shutdown: {
            jobs: new Set(),
            add(job) { this.jobs.add(job); },
            remove(job) { this.jobs.delete(job); },
            exec() {
                for ( const job of [...this.jobs] ) { job(); }
                this.jobs.clear();
            },
        },
        messaging: {
            async send(channel, request) {
                switch ( request.what ) {
                case 'retrieveContentScriptParameters':
                    if ( whitelisted ) { return; }
                    return new Promise(resolve => {
                        const respond = injectedCSS => resolve({
                            prefs: vAPI.prefs,
                            noGenericCosmeticFiltering: true,
                            noSpecificCosmeticFiltering: true,
                            specificCosmeticFilters: { ready: true, injectedCSS },
                        });
                        if ( deferBootstrap ) {
                            window.testApplyFilters = injectedCSS => new Promise((resolveReady, rejectReady) => {
                                const watcher = vAPI.domWatcher;
                                const listener = {
                                    onDOMCreated() {
                                        watcher.removeListener(listener);
                                        onError = undefined;
                                        resolveReady();
                                    },
                                    onDOMChanged() {},
                                };
                                onError = error => {
                                    watcher.removeListener(listener);
                                    onError = undefined;
                                    rejectReady(error);
                                };
                                watcher.addListener(listener);
                                respond(injectedCSS);
                            });
                        } else {
                            respond('');
                        }
                    });
                case 'registerAd':
                    window.testAds.push(request.ad);
                    break;
                case 'getCollapsibleBlockedRequests':
                    return { id: request.id, hash: 'empty', blockedResources: [] };
                }
            },
        },
    };

    window.testSetupScheduler = function() {
        const pending = new Set();
        vAPI.SafeAnimationFrame.prototype.start = function() {
            pending.add(this);
        };
        vAPI.SafeAnimationFrame.prototype.clear = function() {
            pending.delete(this);
        };
        window.testFlushDOM = async () => {
            for ( let i = 0; i < 20; i++ ) {
                await new Promise(resolve => queueMicrotask(resolve));
                if ( pending.size === 0 ) { return; }
                for ( const frame of [...pending] ) {
                    if ( pending.delete(frame) ) { frame.callback(); }
                }
            }
            throw new Error('DOM callbacks did not settle');
        };
    };
}
