/*******************************************************************************

    AdNauseam - Fight back against advertising surveillance.
    Copyright (C) 2014-2026 Daniel C. Howe

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/dhowe/AdNauseam
*/

import { registerScriptlet } from './base.js';
import { safeSelf } from './safe-self.js';

/**
 * @scriptlet adn-dismiss-fullscreen-ad
 *
 * @description
 * AdNauseam hides ads instead of blocking them, so the close button of an
 * AdSense H5 Games Ads fullscreen interstitial (the `adBreak` API) can never
 * be clicked, and the page waits forever for its `adBreakDone` callback.
 * Google shows that ad by setting `location.hash` to `#goog_fullscreen_ad`
 * and closes it when the hash goes away, its own back-button path. This
 * scriptlet lets the ad render (and be collected), then removes the hash the
 * same way, which closes the ad and fires the page's `adBreakDone`.
 *
 * @param [delay]
 * Optional. Seconds to wait after the ad appears before dismissing it, so
 * that it has rendered and been collected. Default 5.
 * */

export function adnDismissFullscreenAd(
    delay = ''
) {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('adn-dismiss-fullscreen-ad', delay);
    const adHash = '#goog_fullscreen_ad';
    const shownAd = 'ins.adsbygoogle-noablate[data-ad-status="filled"][aria-hidden="false"]';
    const wait = (parseFloat(delay) || 5) * 1000;
    let timer;
    self.addEventListener('hashchange', ev => {
        if ( ev.newURL.endsWith(adHash) === false ) { return; }
        if ( timer !== undefined ) { return; }
        safe.uboLog(logPrefix, `Fullscreen ad shown, dismissing in ${wait} ms`);
        timer = setTimeout(( ) => {
            timer = undefined;
            if ( self.location.hash !== adHash ) { return; }
            if ( document.querySelector(shownAd) === null ) { return; }
            safe.uboLog(logPrefix, 'Dismissing fullscreen ad');
            self.history.back();
        }, wait);
    });
}
registerScriptlet(adnDismissFullscreenAd, {
    name: 'adn-dismiss-fullscreen-ad.js',
    dependencies: [
        safeSelf,
    ],
    world: 'ISOLATED',
});
