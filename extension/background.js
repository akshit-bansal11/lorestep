/* Lorestep for Chrome background service worker.
   1. The right-click menu: forwards the chosen state to the tab, whose content script knows
      which poster was under the pointer and writes it.
   2. The backup file: Chrome deletes an extension's storage when it is uninstalled (IndexedDB
      included), so "Back up now" in the library saves Downloads/Dogear/dogear-backup.json, a file
      the user owns, which the library can restore from after a reinstall. Never written on its
      own: the user backs up when they choose. No account, no server. The file goes through a
      blob URL made in a short-lived offscreen page (offscreen/): data: URLs are capped at 2 MB
      and a worker can't make blob URLs.
   3. Lorestep sign-in (core/auth.js) and mark sync (core/sync.js): the only network code, and
      it runs only here. The library asks for sign-in, sign-out, the status and "sync now"; the
      tokens never leave this worker. Sync runs 3 s after a mark change is queued, at sign-in,
      at browser start, when the library opens, every 30 minutes (alarm), and on the button.
   Menu names and validation come from core/; the sites come from the manifest. */
importScripts("core/states.js", "core/store.js", "core/auth.js", "core/sync.js");

const D = globalThis.Lorestep;
const PATTERNS = chrome.runtime.getManifest().content_scripts.flatMap((c) => c.matches);
const CONTEXTS = ["page", "link", "image", "video", "frame"];
const DOWNLOAD_TIMEOUT_MS = 15000;
const auth = D.makeAuth({
  fetch: (url, init) => fetch(url, init),
  storage: chrome.storage.local,
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

// ---------- backup file ----------

const setStatus = (patch) =>
  chrome.storage.local
    .get(D.BACKUP_STATUS_KEY)
    .then((cur) => chrome.storage.local.set({ [D.BACKUP_STATUS_KEY]: { ...cur[D.BACKUP_STATUS_KEY], ...patch } }));

/** Resolves when the download finishes, rejects if it fails or stalls. */
const finished = (id) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => done(new Error("The backup download didn't finish.")), DOWNLOAD_TIMEOUT_MS);
    function done(err) {
      clearTimeout(timer);
      chrome.downloads.onChanged.removeListener(watch);
      err ? reject(err) : resolve();
    }
    function watch(delta) {
      if (delta.id !== id || !delta.state) return;
      if (delta.state.current === "in_progress") return;
      done(delta.state.current === "complete" ? null : new Error(delta.error?.current || "interrupted"));
    }
    chrome.downloads.onChanged.addListener(watch);
    // A small download can finish before the listener above existed. Check its current state.
    chrome.downloads.search({ id }).then(
      ([item]) => {
        if (item?.state === "complete") done(null);
        else if (item?.state === "interrupted") done(new Error(item.error || "interrupted"));
      },
      () => {},
    ); // on failure the listener and timeout still decide
  });

let creating = null;

/** Opens the offscreen page that makes blob URLs, once even if called twice at the same time. */
const ensureOffscreen = () =>
  (creating ??= (async () => {
    if (await chrome.offscreen.hasDocument?.()) return;
    try {
      await chrome.offscreen.createDocument({
        url: "offscreen/offscreen.html",
        reasons: ["BLOBS"],
        justification: "Build the backup file as a blob URL for chrome.downloads.",
      });
    } catch (err) {
      // Chrome 114-115 has no hasDocument: its "single offscreen document" error means it exists.
      if (!/single offscreen document/i.test(String(err?.message))) throw err;
    }
  })().finally(() => {
    creating = null;
  }));

let running = null;

/** Writes the backup file. Only ever runs when the user clicks "Back up now". */
const backup = () =>
  (running ??= (async () => {
    const all = await chrome.storage.local.get(null);
    const status = all[D.BACKUP_STATUS_KEY] || {};
    // After a fresh install the list is empty or new. Writing now would replace the user's real
    // backup with it, so wait until they restore from the file or choose to start fresh.
    if (status.pending) return { skipped: "pending" };
    const entries = Object.entries(all)
      .map(([k, v]) => [k, D.validEntry(k, v)])
      .filter(([, e]) => e);
    if (!entries.length) return { skipped: "empty" }; // never overwrite a backup with nothing

    let url = "";
    let hidUi = false;
    try {
      // Hide Chrome's download bubble for our own file; restored right after.
      await chrome.downloads.setUiOptions({ enabled: false });
      hidUi = true;
    } catch {}
    try {
      await ensureOffscreen();
      const res = await chrome.runtime.sendMessage({
        target: "offscreen",
        type: "lorestep:blob-url",
        text: D.toExport(entries),
      });
      if (!res?.url) throw new Error(res?.error || "Couldn't prepare the backup file.");
      url = res.url;
      const id = await chrome.downloads.download({
        url,
        filename: D.BACKUP_FILE,
        conflictAction: "overwrite",
        saveAs: false,
      });
      await finished(id);
      await chrome.downloads.erase({ id }); // drops the history row only; the file stays
      await setStatus({ at: Date.now(), count: entries.length, error: "" });
      return { ok: true };
    } catch (err) {
      const error = String(err?.message || err);
      // "Ask where to save each file" is on and the user closed the Save dialog: their choice,
      // not a failure. saveAs:false doesn't suppress that dialog (seen in e2e, Chrome 157).
      if (error === "USER_CANCELED") return { ok: false, canceled: true };
      await setStatus({ error, failedAt: Date.now() });
      return { ok: false, error };
    } finally {
      if (hidUi) chrome.downloads.setUiOptions({ enabled: true }).catch(() => {});
      // Free the blob, then close the page so it holds no memory between backups.
      if (url) await chrome.runtime.sendMessage({ target: "offscreen", type: "lorestep:revoke", url }).catch(() => {});
      chrome.offscreen.closeDocument().catch(() => {});
    }
  })().finally(() => {
    running = null;
  }));

// The library page asks for "back up now", reports how a restore went, and drives sign-in.
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const fromLibrary = sender.id === chrome.runtime.id && sender.url?.startsWith(chrome.runtime.getURL("library/"));
  if (!fromLibrary) return;
  if (msg?.type === "lorestep:backup-now") {
    backup().then(reply);
    return true; // reply asynchronously
  }
  if (msg?.type === "lorestep:restore-decided") {
    setStatus({ pending: false }).then(() => reply({ ok: true }));
    return true;
  }
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
chrome.runtime.onInstalled.addListener(({ reason }) => {
  buildMenu();
  sync.run();
  if (reason === "install") {
    // A reinstall starts with empty storage: hold backups and offer a restore first.
    setStatus({ pending: true }).then(() =>
      chrome.tabs.create({ url: chrome.runtime.getURL("library/library.html#welcome") }),
    );
  }
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
