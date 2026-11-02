/*******************************************************************************
    AdNauseam MV3 - Broadcast shim

    Provides onBroadcast() for vault.js.
    In MV3, the background uses chrome.runtime.sendMessage to broadcast,
    so we listen via chrome.runtime.onMessage instead of BroadcastChannel.
*******************************************************************************/

'use strict';

export function onBroadcast(listener) {
  chrome.runtime.onMessage.addListener((msg) => {
    listener(msg);
  });
}
