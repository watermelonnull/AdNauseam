/*******************************************************************************
    AdNauseam MV3 - vAPI Shim

    Provides the vAPI interface that vault.js and adn-utils.js expect,
    backed by MV3's chrome.runtime.sendMessage.

    This replaces vapi.js + vapi-common.js + vapi-client.js for MV3.
*******************************************************************************/

'use strict';

(function() {
  if (self.vAPI) return; // already defined

  const vAPI = self.vAPI = {};

  // Messaging: vault.js uses vAPI.messaging.send(channel, msg)
  // In MV3, channel is ignored — all messages go through chrome.runtime
  vAPI.messaging = {
    send(channel, msg) {
      return chrome.runtime.sendMessage(msg);
    }
  };

  // Download: used by adn-utils.js exportToFile / generateCaptureSvg
  vAPI.download = function(details) {
    if (!details || !details.url) return;
    const a = document.createElement('a');
    a.href = details.url;
    a.setAttribute('download', details.filename || 'download');
    a.setAttribute('type', 'text/plain');
    a.dispatchEvent(new MouseEvent('click'));
  };

  // i18n helper (used by some UI code)
  vAPI.i18n = chrome.i18n.getMessage;

})();
