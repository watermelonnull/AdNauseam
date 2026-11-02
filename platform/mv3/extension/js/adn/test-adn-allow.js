/*
    AdNauseam parity test: verify that requests allowed by MV2 runtime
    adn-allow are also allowed by the MV3 adn-allow DNR ruleset.

    Usage (from the extension service-worker devtools console):
        const m = await import('./js/adn/test-adn-allow.js');
        await m.runAdnAllowParityTest();

    The runner enables the `adn-allow` ruleset before testing, then
    queries chrome.declarativeNetRequest.testMatchOutcome for each
    fixture and prints a side-by-side table.
*/

const CNN_INITIATOR = 'https://edition.cnn.com';

// Seeded from MV2 logger output on cnn.com — deduped by domain x type.
// Long query strings trimmed (DNR matching uses domain/path patterns;
// trailing query parameters do not affect rule selection).
const fixtures = [
    { url: 'https://events.brightline.tv/track', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'options' },
    { url: 'https://api.btloader.com/pv?nlf=false&tid=jG3kKMmtDw&sid=qwfVjHx2E', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'post' },
    { url: 'https://api.btloader.com/country?o=5762268746743808', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'get' },
    { url: 'https://c.amazon-adsystem.com/bao-csm/aps-comm/aps_csm.js', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'get' },
    { url: 'https://api.bounceexchange.com/state/js?website_id=7291', initiator: CNN_INITIATOR, type: 'script', method: 'get' },
    { url: 'https://assets.bounceexchange.com/cache/7291/campaign-index.js', initiator: CNN_INITIATOR, type: 'script', method: 'get' },
    { url: 'https://pubads.g.doubleclick.net/adsid/integrator.json?aos=', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'get' },
    { url: 'https://pagead2.googlesyndication.com/getconfig/sodar?tid=pal&tv=1.0', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'get' },
    { url: 'https://cdn.indexww.com/ht/htw-pixel.gif', initiator: 'https://ssum-sec.casalemedia.com', type: 'image', method: 'get' },
    { url: 'https://people.api.boomtrain.com/identify/resolve?site_id=cnn', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'get' },
    { url: 'https://ssum-sec.casalemedia.com/usermatch?gdpr=1', initiator: 'https://js-sec.indexww.com', type: 'sub_frame', method: 'get' },
    { url: 'https://receive.wmcdp.io/v1/reg', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'post' },
    { url: 'https://e.cdnwidget.com/cjs-logger?source=test', initiator: CNN_INITIATOR, type: 'image', method: 'get' },
    { url: 'https://securepubads.g.doubleclick.net/pcs/view?xai=AKAOjs', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'get' },
    { url: 'https://ad.doubleclick.net/favicon.ico?ad=300x250&ad_box_=1', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'get' },
    { url: 'https://ad-delivery.net/px.gif?ch=2', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'get' },
    { url: 'https://dpm.demdex.net/demconf.jpg?et:ibs', initiator: CNN_INITIATOR, type: 'image', method: 'get' },
    { url: 'https://dpm.demdex.net/ibs:dpid=903', initiator: CNN_INITIATOR, type: 'image', method: 'get' },
    { url: 'https://token.rubiconproject.com/khaos.json?gdpr=1', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'get' },
    { url: 'https://eus.rubiconproject.com/usync.js', initiator: CNN_INITIATOR, type: 'script', method: 'get' },
    { url: 'https://eus.rubiconproject.com/usync.html?gdpr=1', initiator: CNN_INITIATOR, type: 'sub_frame', method: 'get' },
    { url: 'https://match.adsrvr.org/track/usersync?gdpr=1', initiator: CNN_INITIATOR, type: 'image', method: 'get' },
    { url: 'https://gum.criteo.com/syncframe?origin=criteoPrebidAdapter', initiator: CNN_INITIATOR, type: 'sub_frame', method: 'get' },
    { url: 'https://js-sec.indexww.com/um/ixmatch.html', initiator: CNN_INITIATOR, type: 'sub_frame', method: 'get' },
    { url: 'https://ads.pubmatic.com/AdServer/js/user_sync.html?p=160262', initiator: CNN_INITIATOR, type: 'sub_frame', method: 'get' },
    { url: 'https://ids.cdnwidget.com/c?cookieID=&deviceID=', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'get' },
    { url: 'https://ab.dns-finder.com/meta/dns', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'get' },
    { url: 'https://pagead2.googlesyndication.com/pagead/ping?e=1', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'post' },
    { url: 'https://pagead2.googlesyndication.com/pagead/gen_204?id=av-js&type=reach', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'get' },
    { url: 'https://pagead2.googlesyndication.com/pagead/managed/js/activeview/current/ufs_web_display.js', initiator: CNN_INITIATOR, type: 'script', method: 'get' },
    { url: 'https://googleads.g.doubleclick.net/pagead/interaction/?ai=&label=window_focus', initiator: CNN_INITIATOR, type: 'image', method: 'get' },
    { url: 'https://tpc.googlesyndication.com/simgad/11629228081425211045', initiator: CNN_INITIATOR, type: 'image', method: 'get' },
    { url: 'https://tpc.googlesyndication.com/pagead/js/r20260504/r20110914/client/window_focus_fy2021.js', initiator: CNN_INITIATOR, type: 'script', method: 'get' },
    { url: 'https://0af7843831dacc40225e72e767761ba0.safeframe.googlesyndication.com/safeframe/1-0-45/html/container.html', initiator: CNN_INITIATOR, type: 'sub_frame', method: 'get' },
    { url: 'https://securepubads.g.doubleclick.net/gampad/ads?pvsid=7698513835381160', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'get' },
    { url: 'https://cm.g.doubleclick.net/partnerpixels?gdpr=1', initiator: CNN_INITIATOR, type: 'sub_frame', method: 'get' },
    { url: 'https://securepubads.g.doubleclick.net/pagead/managed/dict/m202604300101/gpt', initiator: CNN_INITIATOR, type: 'other', method: 'get' },
    { url: 'https://hbopenbid.pubmatic.com/translator?source=prebid-client', initiator: CNN_INITIATOR, type: 'xmlhttprequest', method: 'post' },
];

function summarizeMatched(matched) {
    if ( matched.length === 0 ) { return 'NO MATCH (default)'; }
    const adn = matched.find(r => r.rulesetId === 'adn-allow');
    if ( adn ) { return `adn-allow #${adn.ruleId}`; }
    const r = matched[0];
    return `OTHER ${r.rulesetId}#${r.ruleId}`;
}

export async function runAdnAllowParityTest({ verbose = false } = {}) {
    const enabled = await chrome.declarativeNetRequest.getEnabledRulesets();
    const wasEnabled = enabled.includes('adn-allow');
    if ( wasEnabled === false ) {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
            enableRulesetIds: [ 'adn-allow' ],
        });
        console.info('[adn-allow test] temporarily enabled adn-allow ruleset');
    }

    const rows = [];
    let allowed = 0, blocked = 0, unmatched = 0, otherRule = 0;
    for ( const f of fixtures ) {
        const { matchedRules = [] } =
            await chrome.declarativeNetRequest.testMatchOutcome(f);
        const adnAllow = matchedRules.find(r => r.rulesetId === 'adn-allow');
        const summary = summarizeMatched(matchedRules);
        if ( adnAllow ) { allowed++; }
        else if ( matchedRules.length === 0 ) { unmatched++; }
        else { otherRule++; }
        rows.push({
            type: f.type,
            url: f.url.length > 70 ? f.url.slice(0, 67) + '…' : f.url,
            mv3: summary,
        });
    }

    console.table(rows);
    console.info(
        `[adn-allow test] adn-allowed: ${allowed}/${fixtures.length}, ` +
        `matched-other: ${otherRule}, unmatched: ${unmatched}`
    );

    if ( wasEnabled === false ) {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
            disableRulesetIds: [ 'adn-allow' ],
        });
        console.info('[adn-allow test] reverted adn-allow ruleset to disabled');
    }

    if ( verbose ) { return { rows, allowed, otherRule, unmatched }; }
    return rows;
}
