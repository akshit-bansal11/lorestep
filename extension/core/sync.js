/* Lorestep for Chrome sync: pushes queued mark changes to Lorestep and pulls the account's changes back
   (lorestep docs/EXTENSION.md). Only background.js calls makeSync, so every request runs in the
   service worker through core/auth.js (bearer header, no cookies). chrome.storage.local stays the
   source of truth: signed out or offline, nothing here changes how the extension works.
   Keys: "sync:q:<title key>" queued changes (core/store.js writes them), "sync:ids" title key ->
   Lorestep entry id, "sync:cursor" the pull cursor, "sync:seeded" the first full upload is queued,
   "sync:rejected:<title key>" marks Lorestep refused, "sync:status" what the library shows.
   All of them are removed on sign-out or a 401. */
(() => {
  "use strict";
  const D = globalThis.Lorestep;

  const Q = D.QUEUE_PREFIX;
  const STATUS_KEY = D.SYNC_STATUS_KEY;
  const IDS_KEY = "sync:ids";
  const CURSOR_KEY = "sync:cursor";
  const SEEDED_KEY = "sync:seeded";
  const REJECTED = "sync:rejected:"; // marks Lorestep refused (400) on their own, kept for Retry
  const LORESTEP = "lorestep";
  const PUSH_MAX = 200; // the API's batch cap
  const PULL_LIMIT = 500; // the API's page cap
  const MAX_PAGES = 20; // per run; the next run continues from the stored cursor
  const KINDS = "movie,series,anime";
  const BACKOFF_MS = 60000;
  const BACKOFF_MAX_MS = 30 * 60000;
  const ENTRY_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
  const CURSOR_MAX = 2048;

  D.SYNC_PERIOD_MIN = 30;
  D.SYNC_PUSH_MAX = PUSH_MAX;

  const readJson = (res) => res.json().catch(() => null);

  /** A queued record, validated like any stored entry; s: null is a clear. Null if unusable. */
  const readRecord = (key, v, now) => {
    const clear = v !== null && typeof v === "object" && v.s === null;
    const e = D.validEntry(key, clear ? { ...v, s: D.ORDER[0] } : v, now);
    if (!e?.at) return null;
    return clear ? { ...e, s: null } : e;
  };

  /** The wire mark for a record, or null when Lorestep can't take it (no title, Lorestep-only key). */
  D.toMark = (key, r) => {
    const k = D.parseKey(key);
    if (!k || k.platform === LORESTEP || !r.title) return null;
    const status = r.s ? D.WIRE.to[r.s] : null;
    const m = { platform: k.platform, platformId: k.id, title: r.title, status, at: r.at };
    if (r.kind) m.kind = r.kind;
    if (r.url) m.url = r.url;
    return m;
  };

  /**
   * Works out what one pull page writes locally, without writing anything.
   * local: Map key -> entry; queue: {key: record} (unsynced local changes); ids: {key: entryId}.
   * Last writer wins on the entry's updatedAt (the pull carries no statusAt) against the local
   * `at`; a tie keeps the local mark, and an unsynced local change at least as new is never
   * clobbered. A tombstone or a cleared status removes the local mark. Everything a server sends
   * passes validEntry, the same barrier as page and import data.
   */
  D.planPull = (changes, local, queue, ids, now = Date.now()) => {
    const writes = {};
    const nextIds = { ...ids };
    const byId = new Map();
    for (const [k, id] of Object.entries(ids)) byId.set(id, [...(byId.get(id) || []), k]);
    for (const c of Array.isArray(changes) ? changes : []) {
      const e = c?.entry;
      const id = e?.id;
      if (typeof id !== "string" || !ENTRY_ID_RE.test(id)) continue;
      const at = Date.parse(e.updatedAt);
      if (!Number.isFinite(at)) continue;
      const gone = c.deleted === true || e.status === null;
      if (!gone && !Object.hasOwn(D.WIRE.from, e.status)) continue;
      const s = gone ? null : D.WIRE.from[e.status];

      const targets = new Map(); // key -> link url
      for (const l of Array.isArray(c.links) ? c.links : []) {
        const k = D.makeKey(l?.platform, l?.platformId);
        const p = D.parseKey(k);
        if (p && p.platform !== LORESTEP) targets.set(k, l.url);
      }
      const own = D.makeKey(LORESTEP, id);
      // Linked now: the Lorestep-only copy made by an earlier pull is no longer needed.
      if (targets.size) {
        if (local.has(own)) writes[own] = null;
        delete nextIds[own];
      }
      for (const k of byId.get(id) || []) if (k !== own && !targets.has(k)) targets.set(k, "");
      if (!targets.size) targets.set(own, "");

      for (const [k, url] of targets) {
        const mine = local.get(k);
        if (queue[k]?.at >= at || mine?.at >= at) continue;
        if (gone) {
          if (mine) writes[k] = null;
        } else {
          const v = D.validEntry(k, { s, title: e.title, kind: e.kind, url: url || mine?.url, at }, now);
          if (v) writes[k] = v;
        }
      }
      for (const k of targets.keys()) {
        if (c.deleted === true) delete nextIds[k];
        else nextIds[k] = id;
      }
    }
    return { writes, ids: nextIds };
  };

  /** Seconds or an HTTP date from Retry-After, as ms; 0 when absent. */
  const retryAfter = (res, now) => {
    const v = res.headers?.get?.("retry-after");
    if (!v) return 0;
    const ms = /^\d+$/.test(v) ? Number(v) * 1000 : Date.parse(v) - now;
    return Number.isFinite(ms) ? Math.min(Math.max(ms, 0), BACKOFF_MAX_MS) : 0;
  };

  /** null for a usable reply; otherwise what the run should do. */
  const failure = (res, now) => {
    if (!res || res.status === 401) return { signedOut: true };
    if (res.status === 429 || res.status >= 500) return { retry: retryAfter(res, now) };
    if (res.status === 409) return { error: "Your Lorestep library is full (5000 titles). Remove some there." };
    if (!res.ok) return { error: `Lorestep refused the sync (${res.status}).` };
    return null;
  };

  /** deps: auth (core/auth.js), storage (chrome.storage.local-like), alarm {set(when), clear()}. */
  D.makeSync = (deps) => {
    const { auth, storage, alarm } = deps;
    const now = deps.now || Date.now;
    let epoch = 0; // bumped by purge: a run still in flight writes nothing after it
    let running = null;
    let again = false;
    let againManual = false;

    const purge = async () => {
      epoch++;
      const all = await storage.get(null);
      await storage.remove(Object.keys(all).filter((k) => k.startsWith("sync:")));
      await alarm.clear();
    };

    /** Records in the queue: [{ qkey, key, at, mark }]; unusable ones are dropped from storage. */
    const readQueue = async (mine) => {
      const all = await storage.get(null);
      const out = [];
      const drop = [];
      for (const [qkey, v] of Object.entries(all)) {
        if (!qkey.startsWith(Q)) continue;
        const key = qkey.slice(Q.length);
        const r = readRecord(key, v, now());
        const mark = r && D.toMark(key, r);
        if (mark) out.push({ qkey, key, at: v.at, mark });
        else drop.push(qkey);
      }
      if (drop.length && mine === epoch) await storage.remove(drop);
      return out;
    };

    /** After sign-in, queue every local mark once so the existing list reaches Lorestep. */
    const seed = async (mine) => {
      const all = await storage.get(null);
      if (all[SEEDED_KEY]) return;
      const sets = { [SEEDED_KEY]: true };
      for (const [k, v] of Object.entries(all)) {
        if (!k.startsWith("t:") || k.startsWith(`t:${LORESTEP}:`) || all[Q + k]) continue;
        const e = D.validEntry(k, v, now());
        if (e) sets[Q + k] = e;
      }
      if (mine === epoch) await storage.set(sets);
    };

    /** A mark Lorestep refuses on its own: parked under sync:rejected:<key> for the user's Retry. */
    const reject = async (b, mine) => {
      const current = (await storage.get(b.qkey))[b.qkey];
      if (mine !== epoch) return { stopped: true };
      if (current?.at !== b.at) return null; // changed meanwhile: the new change gets its own try
      await storage.set({ [REJECTED + b.key]: current });
      await storage.remove([b.qkey]);
      return null;
    };

    /** Pushes one batch. A 400 splits it in halves until the refused marks stand alone, so one
        bad mark never holds back the rest. 401 / 429 / 5xx stop the run as before. */
    const send = async (batch, mine) => {
      const res = await auth.call("/api/v1/sync/push", { marks: batch.map((b) => b.mark) });
      if (res?.status === 400) {
        if (batch.length === 1) return reject(batch[0], mine);
        const half = Math.ceil(batch.length / 2);
        return (await send(batch.slice(0, half), mine)) || send(batch.slice(half), mine);
      }
      const bad = failure(res, now());
      if (bad) return bad;
      const results = (await readJson(res))?.data?.results;
      const ids = (await storage.get(IDS_KEY))[IDS_KEY] || {};
      const answered = new Set();
      for (const r of Array.isArray(results) ? results : []) {
        const k = D.makeKey(r?.platform, r?.platformId);
        if (!D.parseKey(k)) continue;
        answered.add(k);
        if (typeof r.entryId === "string" && ENTRY_ID_RE.test(r.entryId)) ids[k] = r.entryId;
      }
      // Clear only what Lorestep answered and nobody changed again while the request ran.
      // ponytail: a tab writing between this read and the remove loses that one sync; its
      // next change of the title sends it again.
      const current = await storage.get(batch.map((b) => b.qkey));
      const done = batch.filter((b) => answered.has(b.key) && current[b.qkey]?.at === b.at).map((b) => b.qkey);
      if (mine !== epoch) return { stopped: true };
      await storage.set({ [IDS_KEY]: ids });
      if (done.length) await storage.remove(done);
      return null;
    };

    const push = async (mine) => {
      const queue = await readQueue(mine);
      for (let i = 0; i < queue.length; i += PUSH_MAX) {
        const out = await send(queue.slice(i, i + PUSH_MAX), mine);
        if (out) return out;
      }
      return null;
    };

    /** The library's Retry: rejected marks go back in the queue (a newer queued change wins). */
    const requeue = async () => {
      const all = await storage.get(null);
      const sets = {};
      const drop = [];
      for (const [k, v] of Object.entries(all)) {
        if (!k.startsWith(REJECTED)) continue;
        drop.push(k);
        const q = Q + k.slice(REJECTED.length);
        if (!all[q]) sets[q] = v;
      }
      if (!drop.length) return;
      await storage.set(sets);
      await storage.remove(drop);
    };

    const pull = async (mine) => {
      let cursor = (await storage.get(CURSOR_KEY))[CURSOR_KEY];
      let retried = false;
      for (let page = 0; page < MAX_PAGES; page++) {
        const q = new URLSearchParams({ limit: String(PULL_LIMIT), kinds: KINDS });
        if (typeof cursor === "string" && cursor) q.set("since", cursor);
        const res = await auth.call(`/api/v1/sync?${q}`);
        if (res?.status === 400 && q.has("since") && !retried) {
          // A cursor Lorestep didn't mint (or no longer accepts): pull from the start once.
          retried = true;
          cursor = "";
          page--;
          continue;
        }
        const bad = failure(res, now());
        if (bad) return bad;
        const data = (await readJson(res))?.data;
        const changes = Array.isArray(data?.changes) ? data.changes : [];
        const all = await storage.get(null);
        const local = new Map();
        const queue = {};
        for (const [k, v] of Object.entries(all)) {
          if (k.startsWith("t:")) {
            const e = D.validEntry(k, v, now());
            if (e) local.set(k, e);
          } else if (k.startsWith(Q)) {
            const r = readRecord(k.slice(Q.length), v, now());
            if (r) queue[k.slice(Q.length)] = r;
          }
        }
        const plan = D.planPull(changes, local, queue, all[IDS_KEY] || {}, now());
        if (mine !== epoch) return { stopped: true };
        const removes = Object.keys(plan.writes).filter((k) => !plan.writes[k]);
        const sets = Object.fromEntries(Object.entries(plan.writes).filter(([, e]) => e));
        if (removes.length) await storage.remove(removes);
        const next = typeof data?.cursor === "string" && data.cursor.length <= CURSOR_MAX ? data.cursor : cursor;
        // Entries first, cursor last: a run killed in between pulls the same page again.
        await storage.set({ ...sets, [IDS_KEY]: plan.ids, [CURSOR_KEY]: next || "" });
        cursor = next;
        if (changes.length < PULL_LIMIT) break;
      }
      return null;
    };

    const once = async (manual) => {
      const mine = epoch;
      if (!(await auth.signedIn())) {
        await purge();
        return { state: "signed-out" };
      }
      const prev = (await storage.get(STATUS_KEY))[STATUS_KEY] || {};
      if (!manual && prev.retryAt > now()) return prev;
      let out;
      try {
        await seed(mine);
        out = (await push(mine)) || (await pull(mine));
      } catch {
        out = { retry: 0 }; // offline, DNS, Lorestep down: keep the queue, back off
      }
      if (mine !== epoch || out?.stopped) return null;
      if (out?.signedOut) {
        await purge(); // auth.call already deleted the token and showed "signed out"
        return { state: "signed-out" };
      }
      const pending = (await readQueue(mine)).length;
      const rejected = Object.keys(await storage.get(null)).filter((k) => k.startsWith(REJECTED)).length;
      let next;
      if (out && "retry" in out) {
        const failures = (prev.failures || 0) + 1;
        const wait = Math.max(out.retry, Math.min(BACKOFF_MS * 2 ** (failures - 1), BACKOFF_MAX_MS));
        next = {
          state: "error",
          at: prev.at || 0,
          pending,
          rejected,
          failures,
          retryAt: now() + wait,
          error: "Couldn't reach Lorestep. It will try again.",
        };
        await alarm.set(next.retryAt);
      } else if (out?.error) {
        next = { state: "error", at: prev.at || 0, pending, rejected, failures: 0, retryAt: 0, error: out.error };
      } else {
        next = { state: "ok", at: now(), pending, rejected, failures: 0, retryAt: 0 };
        await alarm.set(0);
      }
      if (mine !== epoch) return null;
      await storage.set({ [STATUS_KEY]: next });
      return next;
    };

    /** One run at a time; a request during a run queues exactly one more. Never rejects.
        manual (the library's button) ignores the backoff wait. */
    const run = (manual = false) => {
      if (running) {
        again = true;
        againManual ||= manual;
        return running;
      }
      const p = (async () => {
        let result = null;
        let m = manual;
        do {
          again = false;
          try {
            result = await once(m);
          } catch (err) {
            console.warn("Lorestep for Chrome: sync failed", err);
          }
          m = againManual;
          againManual = false;
        } while (again);
        return result;
      })().finally(() => {
        running = null;
      });
      running = p;
      return p;
    };

    return { run, purge, requeue };
  };
})();
