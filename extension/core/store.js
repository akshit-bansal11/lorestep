/* Dogear store: validation, the in-memory cache over chrome.storage.local, the title index that
   links the same show across tiles, IDs and services, and export / import.
   Everything read from storage, a page, or an import file is untrusted and passes validEntry(). */
(() => {
  "use strict";
  const D = globalThis.Dogear;

  const KEY_RE = /^t:([a-z0-9]{2,20}):([A-Za-z0-9_-]{1,128})$/;
  const KINDS = new Set(["series", "movie"]);
  const MAX_TITLE = 200;
  const SETTINGS_KEY = "settings";
  const WRITE_CHUNK = 500;
  // Control (Cc), format (Cf: zero-width, bidi overrides, BOM) and line/paragraph separator
  // characters: stripped so a page can't smuggle invisible or right-to-left spoofing text into
  // the library. Written as property classes: literal escapes here once got saved as the raw
  // characters, and U+2028 is a line break that broke the regex.
  const BREAKS = /[\p{Cc}\p{Zl}\p{Zp}]/gu;
  const FORMAT = /\p{Cf}/gu;
  // ZWNJ / ZWJ shape Devanagari, Malayalam and other Indic titles (and emoji): keep them.
  const JOINERS = new Set([0x200c, 0x200d]);

  D.MAX_IMPORT_BYTES = 20 * 1024 * 1024;
  D.MAX_IMPORT_TITLES = 100000;
  D.MAX_STORE_BYTES = 9 * 1024 * 1024; // margin under storage.local's 10 MB quota

  D.makeKey = (platform, id) => `t:${platform}:${id}`;

  D.parseKey = (key) => {
    const m = typeof key === "string" ? KEY_RE.exec(key) : null;
    return m && Object.hasOwn(D.PLATFORMS, m[1]) ? { platform: m[1], id: m[2] } : null;
  };

  D.cleanTitle = (s) =>
    String(s ?? "")
      .replace(BREAKS, " ")
      .replace(FORMAT, (c) => (JOINERS.has(c.codePointAt(0)) ? c : ""))
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_TITLE);

  /**
   * The matching form of a title, used to link the same show across tiles, IDs and services.
   * "The Boys – Season 1 (Hindi)" and "The Boys" both become "the boys".
   * Only season markers are stripped: "Part 2" / "Vol. 1" name different films, so they stay.
   * Returns "" when there is too little left to match on safely.
   */
  const normalize = (s) => {
    const t = D.cleanTitle(s)
      .normalize("NFKD")
      // Drop accents only from Latin, Greek and Cyrillic ("é" -> "e"). In Indic scripts the marks
      // are vowels: "काल", "किल" and "कुल" are different words and must not be linked.
      .replace(/([\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}])\p{M}+/gu, "$1")
      .toLowerCase()
      .replace(/\s*[([][^)\]]*[)\]]/g, " ")
      .replace(/\s*(?:[-–—:,|]\s*)?\b(?:season|series)\s*\d+\b.*$/u, "")
      .replace(/\s*(?:[-–—:,|]\s*)?\bs\d{1,2}\b.*$/u, "")
      .replace(/&/g, " and ")
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
      .trim();
    return t.length >= 2 ? t : "";
  };

  // Called for every tile on every repaint; titles repeat, so remember the answer.
  const normCache = new Map();
  D.normTitle = (s) => {
    let r = normCache.get(s);
    if (r === undefined) {
      if (normCache.size >= 5000) normCache.clear();
      r = normalize(s);
      normCache.set(s, r);
    }
    return r;
  };

  D.cleanUrl = (raw, platform) => {
    try {
      const u = new URL(String(raw));
      const ok =
        u.protocol === "https:" && !u.username && !u.password && D.PLATFORMS[platform]?.hosts.includes(u.hostname);
      return ok ? u.origin + u.pathname : "";
    } catch {
      return "";
    }
  };

  /** Returns a clean copy of a stored entry, or null if it can't be trusted. */
  D.validEntry = (key, v, now = Date.now()) => {
    const k = D.parseKey(key);
    if (!k || !v || typeof v !== "object" || Array.isArray(v) || !D.isState(v.s)) return null;
    return {
      s: v.s,
      title: D.cleanTitle(v.title),
      kind: KINDS.has(v.kind) ? v.kind : "",
      url: D.cleanUrl(v.url, k.platform),
      // A future timestamp would win every merge forever, so clamp it to now.
      at: Number.isFinite(v.at) && v.at > 0 ? Math.min(Math.floor(v.at), now) : 0,
    };
  };

  D.validSettings = (v) => ({
    dim: typeof v?.dim === "boolean" ? v.dim : true,
    match: typeof v?.match === "boolean" ? v.match : true,
    dock: v?.dock === "min" ? "min" : "open",
  });

  /** Storage key for the backup file's status, written by background.js. Not a title key. */
  D.BACKUP_STATUS_KEY = "backup:status";
  D.BACKUP_FILE = "Dogear/dogear-backup.json";

  // Lorestep sync keys (core/auth.js, core/sync.js). "auth:status" holds no secret.
  D.AUTH_STATUS_KEY = "auth:status";
  D.SYNC_STATUS_KEY = "sync:status";
  /** The dirty queue: one key per changed title ("sync:q:" + title key) holding the change, so
      repeated changes coalesce, tabs never race on one shared array, and a killed worker or an
      offline browser loses nothing. Written only while signed in to Lorestep. */
  D.QUEUE_PREFIX = "sync:q:";

  D.toExport = (entries, now = Date.now()) =>
    JSON.stringify(
      {
        format: "dogear",
        version: 1,
        exportedAt: new Date(now).toISOString(),
        titles: Object.fromEntries(entries),
      },
      null,
      2,
    );

  /**
   * Works out what an import would write, without writing anything.
   * Merge only: an import never deletes, and never replaces an entry that is newer locally.
   */
  D.planImport = (text, existing, now = Date.now()) => {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { error: "That file isn't valid JSON." };
    }
    const titles = data?.titles;
    if (
      data?.format !== "dogear" ||
      data.version !== 1 ||
      !titles ||
      typeof titles !== "object" ||
      Array.isArray(titles)
    ) {
      return { error: "That file isn't a Dogear export." };
    }
    const keys = Object.keys(titles);
    if (keys.length > D.MAX_IMPORT_TITLES) {
      return { error: `That file has ${keys.length} titles. The limit is ${D.MAX_IMPORT_TITLES}.` };
    }
    const writes = {};
    let skipped = 0;
    let older = 0;
    for (const key of keys) {
      const e = D.validEntry(key, titles[key], now);
      if (!e) {
        skipped++;
        continue;
      }
      const cur = existing.get(key);
      if (cur && cur.at >= e.at) {
        older++;
        continue;
      }
      writes[key] = e;
    }
    // chrome.storage.local holds 10 MB; refuse an import that wouldn't fit rather than fail halfway.
    // UTF-8 bytes, as the quota counts them: an Indic title is up to 3x its .length.
    const enc = new TextEncoder();
    const bytes = enc.encode(JSON.stringify([...existing])).length + enc.encode(JSON.stringify(writes)).length;
    if (bytes > D.MAX_STORE_BYTES) {
      return { error: "That import wouldn't fit in the browser's storage for Dogear (10 MB)." };
    }
    return { writes, skipped, older };
  };

  // ---------- runtime store ----------

  const cache = new Map(); // key -> entry
  const byTitle = new Map(); // normTitle -> Set<key>
  const listeners = new Set();
  let settings = D.validSettings({});
  let syncing = false; // signed in to Lorestep: commits also queue their changes for the worker
  const readAuthStatus = (v) => {
    syncing = v?.state === "signed-in";
  };

  const indexAdd = (key, e) => {
    const n = D.normTitle(e.title);
    if (!n) return;
    let set = byTitle.get(n);
    if (!set) {
      set = new Set();
      byTitle.set(n, set);
    }
    set.add(key);
  };
  const indexDrop = (key, e) => {
    const n = e && D.normTitle(e.title);
    const set = n && byTitle.get(n);
    if (!set) return;
    set.delete(key);
    if (!set.size) byTitle.delete(n);
  };
  const put = (key, e) => {
    indexDrop(key, cache.get(key));
    if (e) {
      cache.set(key, e);
      indexAdd(key, e);
    } else cache.delete(key);
  };

  const emit = (keys) => {
    for (const fn of listeners) {
      try {
        fn(keys);
      } catch (err) {
        console.error("Dogear: listener failed", err);
      }
    }
  };

  /** Every key that stands for the same show as (key, title): itself plus title matches. */
  const groupOf = (key, title) => {
    const keys = new Set([key]);
    if (settings.match) {
      // Both the label on this tile and the title stored for the key: a tile labelled a little
      // differently must not unlink a show that is already linked.
      for (const n of new Set([D.normTitle(title), D.normTitle(cache.get(key)?.title)])) {
        for (const k of (n && byTitle.get(n)) || []) keys.add(k);
      }
    }
    return keys;
  };

  /** Applies {key: entry|null} to the cache now, and returns the inverse for a rollback. */
  const applyLocal = (changes) => {
    const undo = {};
    for (const [k, e] of Object.entries(changes)) {
      undo[k] = cache.get(k) ?? null;
      put(k, e);
    }
    emit(Object.keys(changes));
    return undo;
  };

  /** Queue records for a commit: the new entry, or a clear (s: null) carrying the old title. */
  const queued = (changes, undo) => {
    const q = {};
    if (!syncing) return q;
    const at = Date.now();
    for (const [k, e] of Object.entries(changes)) {
      if (e) q[D.QUEUE_PREFIX + k] = e;
      else if (undo[k]) q[D.QUEUE_PREFIX + k] = { ...undo[k], s: null, at };
    }
    return q;
  };

  const persist = async (changes, queue) => {
    const sets = {};
    const removes = [];
    for (const [k, e] of Object.entries(changes)) {
      if (e) sets[k] = e;
      else removes.push(k);
    }
    // ponytail: queue records go last, so they never land for an entry that didn't; a failure
    // after the entries landed loses only the sync of that change (the next local change of the
    // title, or a fresh sign-in, sends it).
    Object.assign(sets, queue);
    if (removes.length) await chrome.storage.local.remove(removes);
    const keys = Object.keys(sets);
    for (let i = 0; i < keys.length; i += WRITE_CHUNK) {
      const chunk = {};
      for (const k of keys.slice(i, i + WRITE_CHUNK)) chunk[k] = sets[k];
      await chrome.storage.local.set(chunk);
    }
  };

  /** Optimistic write: the UI updates at once, and rolls back if storage refuses. */
  const commit = async (changes) => {
    const undo = applyLocal(changes);
    try {
      await persist(changes, queued(changes, undo));
      return true;
    } catch (err) {
      console.warn("Dogear: could not save", err);
      // A later chunk may have failed after earlier ones landed: re-read what storage really
      // holds rather than assume nothing was written.
      try {
        await D.store.load();
        emit(Object.keys(changes));
      } catch {
        applyLocal(undo);
      }
      return false;
    }
  };

  D.store = {
    /** False once the extension has been reloaded or updated under an open tab. */
    alive: () => Boolean(globalThis.chrome?.runtime?.id),

    async load() {
      const all = await chrome.storage.local.get(null);
      cache.clear();
      byTitle.clear();
      for (const [k, v] of Object.entries(all)) {
        if (k === SETTINGS_KEY) settings = D.validSettings(v);
        else if (k === D.AUTH_STATUS_KEY) readAuthStatus(v);
        else {
          const e = D.validEntry(k, v);
          if (e) put(k, e);
        }
      }
    },

    get: (key) => cache.get(key),
    entries: () => cache,
    settings: () => settings,

    /** The entry a tile should show: its own, or the newest one for the same title elsewhere. */
    resolve(key, title) {
      let best = cache.get(key);
      for (const k of groupOf(key, title)) {
        const e = cache.get(k);
        if (e && (!best || e.at > best.at)) best = e;
      }
      return best;
    },

    /** Same show, other keys: used by the library to collapse duplicates into one row. */
    groupOf,

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /**
     * Marks a title, or clears it with state = null. The change reaches every entry that
     * stands for the same show, so all its tiles and services agree.
     */
    set(key, state, meta = {}) {
      if (!D.parseKey(key) || (state !== null && !D.isState(state))) return Promise.resolve(false);
      const at = Date.now();
      const changes = {};
      for (const k of groupOf(key, meta.title)) {
        const prev = cache.get(k);
        if (!state) {
          if (prev || k === key) changes[k] = null;
          continue;
        }
        if (k !== key && !prev) continue;
        const own = k === key ? meta : {};
        const e = D.validEntry(k, {
          s: state,
          title: prev?.title || own.title,
          kind: own.kind || prev?.kind,
          url: own.url || prev?.url,
          at,
        });
        if (e) changes[k] = e;
      }
      return commit(changes);
    },

    /** Fills in a missing title / kind / URL without touching the state or its timestamp. */
    fill(key, meta) {
      const e = cache.get(key);
      if (!e || (e.title && e.kind && e.url)) return Promise.resolve(true);
      const next = D.validEntry(key, {
        ...e,
        title: e.title || meta.title,
        kind: e.kind || meta.kind,
        url: e.url || meta.url,
      });
      if (!next || (next.title === e.title && next.kind === e.kind && next.url === e.url)) {
        return Promise.resolve(true);
      }
      return commit({ [key]: next });
    },

    /** Writes validated entries from an import. */
    writeMany: (writes) => commit(writes),

    async setSettings(patch) {
      const prev = settings;
      settings = D.validSettings({ ...settings, ...patch });
      emit([SETTINGS_KEY]);
      try {
        await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
        return true;
      } catch (err) {
        console.warn("Dogear: could not save settings", err);
        settings = prev;
        emit([SETTINGS_KEY]);
        return false;
      }
    },
  };

  // Every tab and the library page share one store: a change anywhere repaints everywhere.
  globalThis.chrome?.storage?.onChanged?.addListener((changes, area) => {
    if (area !== "local") return;
    const keys = [];
    for (const [k, { newValue }] of Object.entries(changes)) {
      if (k === D.AUTH_STATUS_KEY) readAuthStatus(newValue);
      // Queue, sync and backup keys change often and draw nothing: no repaint for them.
      if (k !== SETTINGS_KEY && !k.startsWith("t:")) continue;
      if (k === SETTINGS_KEY) settings = D.validSettings(newValue);
      else put(k, newValue === undefined ? null : D.validEntry(k, newValue));
      keys.push(k);
    }
    if (keys.length) emit(keys);
  });
})();
