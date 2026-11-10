/* Lorestep for Chrome background service worker.
   1. The right-click menu: forwards the chosen state to the tab, whose content script knows
      which poster was under the pointer and writes it.
   2. Lorestep sign-in (core/auth.js) and mark sync (core/sync.js): the only network code, and
      it runs only here. The library asks for sign-in, sign-out, the status and "sync now"; the
      tokens never leave this worker. Sync runs 3 s after a mark change is queued, at sign-in,
      at browser start, when the library opens, every 30 minutes (alarm), and on the button.
   Menu names and validation come from core/; the sites come from the manifest. */
importScripts("core/states.js", "core/store.js", "core/auth.js", "core/sync.js");

const D = globalThis.Lorestep;
const PATTERNS = chrome.runtime.getManifest().content_scripts.flatMap((c) => c.matches);
const CONTEXTS = ["page", "link", "image", "video", "frame"];
const auth = D.makeAuth({
  fetch: (url, init) => fetch(url, init),
  storage: chrome.storage.local, // auth:status only
  vault: D.idbVault(indexedDB), // the tokens: content scripts can read chrome.storage.local, not this
  launchFlow: (url) => chrome.identity.launchWebAuthFlow({ url, interactive: true }),
  redirectUri: chrome.identity.getRedirectURL(), // https://<extension id>.chromiumapp.org/
});
const SYNC_ALARM = "dogear-sync"; // kept from the Dogear name: Chrome keeps alarms across updates
const SYNC_DEBOUNCE_MS = 3000;
const sync = D.makeSync({
  auth,
  storage: chrome.storage.local,
  alarm: {
    // when = a retry time, or 0 for the regular period from now
    set: (when) => chrome.alarms.create(SYNC_ALARM, { ...(when ? { when } : {}), periodInMinutes: D.SYNC_PERIOD_MIN }),
    clear: () => chrome.alarms.clear(SYNC_ALARM),
  },
});

// ---------- right-click menu ----------

const buildMenu = () =>
  chrome.contextMenus.removeAll(() => {
    const base = { contexts: CONTEXTS, documentUrlPatterns: PATTERNS };
    chrome.contextMenus.create({ ...base, id: "lorestep", title: "Lorestep" });
    for (const s of D.ORDER) {
      chrome.contextMenus.create({ ...base, id: `lorestep:${s}`, parentId: "lorestep", title: D.STATES[s].name });
    }
    chrome.contextMenus.create({ ...base, id: "lorestep:sep", parentId: "lorestep", type: "separator" });
    chrome.contextMenus.create({ ...base, id: "lorestep:clear", parentId: "lorestep", title: "Remove mark" });
  });

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const id = String(info.menuItemId);
  if (!tab?.id || !id.startsWith("lorestep:")) return;
  const s = id.slice("lorestep:".length);
  const state = s === "clear" ? null : D.isState(s) ? s : undefined;
  if (state === undefined) return;
  chrome.tabs.sendMessage(tab.id, { type: "lorestep:mark", state }, { frameId: info.frameId ?? 0 }).catch(() => {}); // the tab was closed or never ran the extension: nothing to mark
});

// The library page drives sign-in, sign-out, the status and "sync now".
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const fromLibrary = sender.id === chrome.runtime.id && sender.url?.startsWith(chrome.runtime.getURL("library/"));
  if (!fromLibrary) return;
  if (msg?.type === "lorestep:signin") {
    auth.signIn(); // the sign-in window outlives the popup; progress lands in auth:status
    reply({ ok: true });
    return;
  }
  if (msg?.type === "lorestep:signout") {
    // Token first (auth.signOut), then every sync:* key; the marks themselves stay.
    auth.signOut().then(async (r) => {
      await sync.purge();
      reply(r);
    });
    return true;
  }
  if (msg?.type === "lorestep:sync-now") {
    // requeue: the Retry for marks Lorestep refused puts them back in the queue first.
    const before = msg.requeue === true ? sync.requeue().catch(() => {}) : Promise.resolve();
    before.then(() => sync.run(msg.manual === true));
    reply({ ok: true });
    return;
  }
  if (msg?.type === "lorestep:auth-status") {
    auth.status().then(reply); // state, email and message only: never a token
    return true;
  }
});

// Listeners above are registered at the top level so the service worker wakes for them.
chrome.runtime.onInstalled.addListener(() => {
  buildMenu();
  sync.run();
});
chrome.runtime.onStartup.addListener(() => {
  buildMenu();
  sync.run();
});
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === SYNC_ALARM) sync.run();
});

// A content script or the library queued a mark change (core/store.js), or sign-in finished:
// sync once things settle. The worker's own queue removals carry no newValue and are ignored.
let soon = 0;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  const queued = Object.keys(changes).some((k) => k.startsWith(D.QUEUE_PREFIX) && changes[k].newValue !== undefined);
  const signedIn = changes[D.AUTH_STATUS_KEY]?.newValue?.state === "signed-in";
  if (!queued && !signedIn) return;
  clearTimeout(soon);
  soon = setTimeout(() => sync.run(), SYNC_DEBOUNCE_MS);
});
