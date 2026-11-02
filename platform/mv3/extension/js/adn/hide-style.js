/*******************************************************************************

    AdNauseam Lite - the style used to hide ads

    The one place the hiding style is defined. uBOL's content scripts keep
    their upstream `{display:none!important;}`; every hide rule reaches the
    page through the service worker (insertCSS/removeCSS in background.js,
    injectCustomFilters in filter-manager.js), which swaps in the style below.

    Invisible and out of the flow, but with its natural height and a real
    width, so lazy-loaded ads still render and can be collected. `display:none`
    gives the slot no box and the ad is never fetched; a 1px-high box leaves
    matched ad iframes with a 1px viewport; `clip` zeroes IntersectionObserver
    ratios.

*******************************************************************************/

export const adnHideStyle = 'position:absolute!important;left:0!important;right:0!important;opacity:0!important;pointer-events:none!important;';

const ubolHideRule = '{display:none!important;}';

// Same text for insertCSS and removeCSS, or the removal will not match
export const adnHideCSS = css => css.replaceAll(ubolHideRule, `{${adnHideStyle}}`);
