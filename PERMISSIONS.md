# Permissions

Given that AdNauseam is a fork of [uBlock Origin](https://github.com/gorhill/uBlock), it therefore inherits the
same permissions, for the same reasons, which are documented in detail at
[uBO's Permissions page](https://github.com/gorhill/ublock/wiki/Permissions). On Firefox AdNauseam
requests one more, `management`, noted below.

| Permission | Why |
|---|---|
| `alarms` | Schedules periodic background work such as filter list updates and start-up cache writes. |
| `contextMenus` (`menus` on Firefox) | Adds AdNauseam's entries to the page context menu, such as "Block element". |
| `privacy` | Disables prefetching and hyperlink auditing, so a blocked request opens no connection at all. |
| `storage` | Stores settings, filter lists, rules and the collected ads. |
| `tabs` | Reads the active tab for the popup and logger, opens the dashboard and vault, and opens and closes the hidden tabs used to visit ads. |
| `unlimitedStorage` | Filter lists alone exceed the 5 MB default, and AdNauseam also stores every ad it collects, including its image data. |
| `webNavigation` | Tracks frame navigation so per-tab state and cosmetic filtering stay correct. |
| `webRequest` | Inspects network requests to match them against the filter lists and to spot ads worth recording. |
| `webRequestBlocking` | Cancels those requests, which `webRequest` alone cannot do. |
| `<all_urls>` | Ads appear on any site, so blocking and ad detection must run everywhere. |
| `dns` (Firefox) | Resolves canonical names so CNAME-cloaked trackers can be matched against the filter lists. |
| `management` (Firefox) | Warns you when another blocker is enabled, since it would remove ads before AdNauseam can click them. |

`management` is the only permission AdNauseam requests that uBO does not. It is used to
read the names of installed extensions, nothing else.
