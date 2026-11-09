"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

const db = new Map();
const local = {
  async get(k) {
    const keys = k === null ? [...db.keys()] : [].concat(k);
    return Object.fromEntries(keys.filter((x) => db.has(x)).map((x) => [x, structuredClone(db.get(x))]));
  },
  async set(o) {
    for (const [k, v] of Object.entries(o)) db.set(k, structuredClone(v));
  },
  async remove(keys) {
    for (const k of [].concat(keys)) db.delete(k);
  },
};
globalThis.chrome = { runtime: { id: "x" }, storage: { onChanged: { addListener() {} }, local } };
require("../core/states.js");
require("../core/store.js");
require("../core/sync.js");
const D = globalThis.Lorestep;

const NOW = 1_700_000_000_000;
const Q = D.QUEUE_PREFIX;
const NF = "t:netflix:80057281";

const reply = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  headers: { get: (h) => headers[h.toLowerCase()] ?? null },
});
function pushOk(_path, body) {
  const results = body.marks.map((m) => ({
    platform: m.platform,
    platformId: m.platformId,
    entryId: `e-${m.platformId}`,
    status: m.status,
    statusAt: new Date(m.at).toISOString(),
  }));
  return reply(200, { data: { applied: results.length, skipped: 0, results } });
}
const pullEmpty = () => reply(200, { data: { changes: [], cursor: "c1" } });

/** Fresh storage plus a fake auth whose call() answers from `replies` by path (no query). */
function world(replies = {}, { signedIn = true, seeded = true } = {}) {
  db.clear();
  if (seeded) db.set("sync:seeded", true);
  const calls = [];
  const alarms = [];
  const state = { signedIn };
  const auth = {
    signedIn: async () => state.signedIn,
    call: async (path, body) => {
      if (!state.signedIn) return null;
      calls.push({ path, body: structuredClone(body) });
      const q = replies[path.split("?")[0]];
      let next = Array.isArray(q) ? q.shift() : q;
      if (typeof next === "function") next = await next(path, body);
      if (next instanceof Error) throw next;
      if (!next) throw new Error(`unexpected request ${path}`);
      if (next.status === 401) state.signedIn = false; // what core/auth.js does on a 401
      return next;
    },
  };
  const sync = D.makeSync({
    auth,
    storage: local,
    alarm: { set: async (when) => alarms.push(when), clear: async () => alarms.push("clear") },
    now: () => NOW,
  });
  return { sync, calls, alarms };
}

const queueOf = () => [...db.keys()].filter((k) => k.startsWith(Q));
const syncKeys = () => [...db.keys()].filter((k) => k.startsWith("sync:"));

// ---------- the queue (core/store.js) ----------

test("store queues nothing while signed out", async () => {
  db.clear();
  await D.store.load();
  assert.ok(await D.store.set(NF, "watching", { title: "Queue Test One" }));
  assert.deepEqual(queueOf(), []);
});

test("store coalesces repeated changes of a title into one queue record", async () => {
  db.clear();
  db.set(D.AUTH_STATUS_KEY, { state: "signed-in", email: "" });
  await D.store.load();
  await D.store.set(NF, "plan", { title: "Queue Test Two" });
  await D.store.set(NF, "watching", { title: "Queue Test Two" });
  await D.store.set(NF, "completed", { title: "Queue Test Two" });
  assert.deepEqual(queueOf(), [Q + NF]);
  assert.equal(db.get(Q + NF).s, "completed");
  assert.equal(db.get(Q + NF).title, "Queue Test Two");
});

test("a clear is queued as s: null with the old title", async () => {
  db.clear();
  db.set(D.AUTH_STATUS_KEY, { state: "signed-in", email: "" });
  db.set(NF, { s: "plan", title: "Queue Test Three", at: 5 });
  await D.store.load();
  await D.store.set(NF, null, { title: "Queue Test Three" });
  assert.equal(db.has(NF), false);
  const r = db.get(Q + NF);
  assert.equal(r.s, null);
  assert.equal(r.title, "Queue Test Three");
  assert.ok(r.at > 5);
});

test("toMark maps states through D.WIRE and refuses what Lorestep can't take", () => {
  assert.deepEqual(D.toMark(NF, { s: "hold", title: "X", kind: "", url: "", at: 9 }), {
    platform: "netflix",
    platformId: "80057281",
    title: "X",
    status: "on_hold",
    at: 9,
  });
  const m = D.toMark(NF, { s: null, title: "X", kind: "series", url: "https://www.netflix.com/title/80057281", at: 9 });
  assert.equal(m.status, null);
  assert.equal(m.kind, "series");
  assert.equal(m.url, "https://www.netflix.com/title/80057281");
  assert.equal(D.toMark(NF, { s: "plan", title: "", at: 9 }), null);
  assert.equal(D.toMark("t:lorestep:abc", { s: "plan", title: "X", at: 9 }), null);
});

// ---------- push ----------

test("push sends batches of at most 200 and clears what Lorestep answered", async () => {
  const w = world({ "/api/v1/sync/push": pushOk, "/api/v1/sync": pullEmpty });
  for (let i = 0; i < 450; i++) {
    db.set(`${Q}t:netflix:${i}`, { s: "plan", title: `Title ${i}`, kind: "", url: "", at: 1000 + i });
  }
  const st = await w.sync.run();
  const pushes = w.calls.filter((c) => c.path === "/api/v1/sync/push");
  assert.deepEqual(
    pushes.map((c) => c.body.marks.length),
    [200, 200, 50],
  );
  assert.equal(pushes[0].body.marks[0].status, "planned");
  assert.deepEqual(queueOf(), []);
  assert.equal(Object.keys(db.get("sync:ids")).length, 450);
  assert.equal(db.get("sync:ids")["t:netflix:7"], "e-7");
  assert.equal(st.state, "ok");
  assert.equal(st.pending, 0);
  assert.equal(db.get(D.SYNC_STATUS_KEY).at, NOW);
});

test("the queue survives a rejected fetch, and backoff holds until a manual retry", async () => {
  const w = world({ "/api/v1/sync/push": [new TypeError("Failed to fetch"), pushOk], "/api/v1/sync": pullEmpty });
  db.set(Q + NF, { s: "watching", title: "The Boys", kind: "", url: "", at: 1000 });
  const st = await w.sync.run();
  assert.equal(st.state, "error");
  assert.equal(st.pending, 1);
  assert.equal(st.retryAt, NOW + 60000);
  assert.deepEqual(w.alarms, [NOW + 60000]);
  assert.deepEqual(queueOf(), [Q + NF]);
  await w.sync.run(); // automatic trigger inside the backoff: no request
  assert.equal(w.calls.length, 1);
  assert.equal((await w.sync.run(true)).state, "ok"); // the library's Retry button
  assert.deepEqual(queueOf(), []);
});

test("429 and 5xx back off, honouring Retry-After", async () => {
  const w = world({ "/api/v1/sync/push": reply(429, null, { "retry-after": "120" }) });
  db.set(Q + NF, { s: "watching", title: "The Boys", kind: "", url: "", at: 1000 });
  assert.equal((await w.sync.run()).retryAt, NOW + 120000);
  const w2 = world({ "/api/v1/sync/push": [reply(503, null), reply(503, null)] });
  db.set(Q + NF, { s: "watching", title: "The Boys", kind: "", url: "", at: 1000 });
  assert.equal((await w2.sync.run()).retryAt, NOW + 60000);
  assert.equal((await w2.sync.run(true)).retryAt, NOW + 120000); // doubles
  assert.deepEqual(queueOf(), [Q + NF]);
});

test("a 401 stops the run and removes every sync key, keeping the marks", async () => {
  const w = world({ "/api/v1/sync/push": reply(401, null) });
  db.set(NF, { s: "watching", title: "The Boys", at: 1000 });
  db.set(Q + NF, { s: "watching", title: "The Boys", kind: "", url: "", at: 1000 });
  db.set("sync:cursor", "c0");
  db.set(D.SYNC_STATUS_KEY, { state: "ok", at: 1 });
  assert.deepEqual(await w.sync.run(), { state: "signed-out" });
  assert.deepEqual(syncKeys(), []);
  assert.ok(db.has(NF));
  assert.equal(w.calls.length, 1);
  assert.deepEqual(w.alarms, ["clear"]);
});

test("signed out: no request, and leftover sync keys are removed", async () => {
  const w = world({}, { signedIn: false });
  db.set(Q + NF, { s: "watching", title: "The Boys", kind: "", url: "", at: 1000 });
  assert.deepEqual(await w.sync.run(), { state: "signed-out" });
  assert.equal(w.calls.length, 0);
  assert.deepEqual(syncKeys(), []);
});

test("a change queued while its push was in flight stays queued", async () => {
  const w = world({
    "/api/v1/sync/push": (path, body) => {
      db.set(Q + NF, { s: "dropped", title: "The Boys", kind: "", url: "", at: 2000 });
      return pushOk(path, body);
    },
    "/api/v1/sync": pullEmpty,
  });
  db.set(Q + NF, { s: "watching", title: "The Boys", kind: "", url: "", at: 1000 });
  const st = await w.sync.run();
  assert.equal(db.get(Q + NF).s, "dropped");
  assert.equal(st.pending, 1);
});

test("unpushable records are dropped from the queue", async () => {
  const w = world({ "/api/v1/sync": pullEmpty });
  db.set(`${Q}t:lorestep:abc`, { s: "plan", title: "X", at: 1000 });
  db.set(`${Q}t:netflix:1`, { s: "plan", title: "", at: 1000 });
  db.set(`${Q}t:nope:1`, { s: "plan", title: "X", at: 1000 });
  await w.sync.run();
  assert.equal(w.calls.filter((c) => c.path === "/api/v1/sync/push").length, 0);
  assert.deepEqual(queueOf(), []);
});

test("the first run after sign-in queues and pushes the existing list", async () => {
  const w = world({ "/api/v1/sync/push": pushOk, "/api/v1/sync": pullEmpty }, { seeded: false });
  db.set(NF, { s: "watching", title: "The Boys", at: 1000 });
  db.set("t:lorestep:e-1", { s: "plan", title: "Lorestep only", at: 1000 });
  await w.sync.run();
  const marks = w.calls.find((c) => c.path === "/api/v1/sync/push").body.marks;
  assert.deepEqual(
    marks.map((m) => m.platformId),
    ["80057281"],
  );
  assert.equal(db.get("sync:seeded"), true);
});

// ---------- pull ----------

const change = (entry, links = [], deleted = false) => ({
  entry: { id: "e-1", kind: "series", title: "The Boys", status: "in_progress", ...entry },
  links,
  deleted,
});
const iso = (ms) => new Date(ms).toISOString();
const NF_LINK = { platform: "netflix", platformId: "80057281", url: "https://www.netflix.com/title/80057281" };

test("pull: a newer server change wins, mapped through D.WIRE", () => {
  const local = new Map([[NF, { s: "plan", title: "The Boys", kind: "", url: "", at: 1000 }]]);
  const p = D.planPull([change({ updatedAt: iso(2000) }, [NF_LINK])], local, {}, {}, NOW);
  assert.deepEqual(p.writes[NF], {
    s: "watching",
    title: "The Boys",
    kind: "series",
    url: "https://www.netflix.com/title/80057281",
    at: 2000,
  });
  assert.equal(p.ids[NF], "e-1");
});

test("pull: at a tie, or against a newer unsynced local change, the local mark stays", () => {
  const local = new Map([[NF, { s: "plan", title: "The Boys", kind: "", url: "", at: 2000 }]]);
  assert.deepEqual(D.planPull([change({ updatedAt: iso(2000) }, [NF_LINK])], local, {}, {}, NOW).writes, {});
  const older = new Map([[NF, { s: "plan", title: "The Boys", kind: "", url: "", at: 1000 }]]);
  const queue = { [NF]: { s: "dropped", title: "The Boys", at: 3000 } };
  assert.deepEqual(D.planPull([change({ updatedAt: iso(2500) }, [NF_LINK])], older, queue, {}, NOW).writes, {});
});

test("pull: a tombstone or a cleared status removes an older local mark", () => {
  const local = new Map([[NF, { s: "plan", title: "The Boys", kind: "", url: "", at: 1000 }]]);
  const gone = D.planPull([change({ updatedAt: iso(2000) }, [], true)], local, {}, { [NF]: "e-1" }, NOW);
  assert.deepEqual(gone.writes, { [NF]: null });
  assert.equal(gone.ids[NF], undefined);
  const cleared = D.planPull([change({ status: null, updatedAt: iso(2000) }, [NF_LINK])], local, {}, {}, NOW);
  assert.deepEqual(cleared.writes, { [NF]: null });
  const stale = D.planPull([change({ updatedAt: iso(500) }, [NF_LINK], true)], local, {}, {}, NOW);
  assert.deepEqual(stale.writes, {});
});

test("pull: an entry with no streaming link is stored under t:lorestep:<id> until it gets one", () => {
  const p = D.planPull([change({ updatedAt: iso(2000) })], new Map(), {}, {}, NOW);
  assert.equal(p.writes["t:lorestep:e-1"].s, "watching");
  assert.equal(p.writes["t:lorestep:e-1"].url, "");
  const local = new Map([["t:lorestep:e-1", p.writes["t:lorestep:e-1"]]]);
  const linked = D.planPull([change({ updatedAt: iso(3000) }, [NF_LINK])], local, {}, p.ids, NOW);
  assert.equal(linked.writes["t:lorestep:e-1"], null);
  assert.equal(linked.writes[NF].s, "watching");
});

test("pull: hostile payloads are dropped or cleaned by validEntry", () => {
  const links = [
    { platform: "evil", platformId: "1", url: "https://evil.example/" },
    { platform: "netflix", platformId: "a b", url: "" },
    { platform: "primevideo", platformId: "B01", url: "https://evil.example/title" },
  ];
  const huge = { id: "e-2", title: `A\u0000B‮${"x".repeat(5000)}`, updatedAt: iso(NOW + 9e9) };
  const changes = [
    change({ id: "../../x", updatedAt: iso(2000) }, [NF_LINK]),
    change({ updatedAt: "yesterday" }, [NF_LINK]),
    change({ status: "__proto__", updatedAt: iso(2000) }, [NF_LINK]),
    change(huge, links),
    null,
    "x",
  ];
  const p = D.planPull(changes, new Map(), {}, {}, NOW);
  assert.deepEqual(Object.keys(p.writes), ["t:primevideo:B01"]);
  const e = p.writes["t:primevideo:B01"];
  assert.equal(e.title.length, 200);
  assert.ok(e.title.startsWith("A B"));
  assert.equal(e.url, "");
  assert.equal(e.at, NOW); // a future clock is clamped
  assert.deepEqual(D.planPull("nope", new Map(), {}, {}, NOW).writes, {});
});

test("pull writes changes, stores the cursor, and pages while a page is full", async () => {
  const full = [];
  for (let i = 0; i < 500; i++) {
    const link = { platform: "netflix", platformId: String(i), url: "" };
    full.push(change({ id: `e-${i}`, title: `T ${i}`, updatedAt: iso(2000) }, [link]));
  }
  const w = world({
    "/api/v1/sync": [
      reply(200, { data: { changes: full, cursor: "p1" } }),
      reply(200, { data: { changes: [], cursor: "p1" } }),
    ],
  });
  await w.sync.run();
  const pulls = w.calls.map((c) => new URL(c.path, "https://x").searchParams);
  assert.equal(pulls.length, 2);
  assert.equal(pulls[0].get("kinds"), "movie,series,anime");
  assert.equal(pulls[0].get("limit"), "500");
  assert.equal(pulls[0].has("since"), false);
  assert.equal(pulls[1].get("since"), "p1");
  assert.equal(db.get("sync:cursor"), "p1");
  assert.equal(db.get("t:netflix:42").s, "watching");
});

test("an unknown cursor is dropped and the pull starts over once", async () => {
  const w = world({ "/api/v1/sync": [reply(400, { error: { code: "invalid_cursor" } }), pullEmpty()] });
  db.set("sync:cursor", "stale");
  assert.equal((await w.sync.run()).state, "ok");
  assert.equal(new URL(w.calls[0].path, "https://x").searchParams.get("since"), "stale");
  assert.equal(new URL(w.calls[1].path, "https://x").searchParams.has("since"), false);
  assert.equal(db.get("sync:cursor"), "c1");
});

test("purge removes every sync key and stops a run in flight from writing", async () => {
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  const w = world({ "/api/v1/sync/push": () => gate.then(() => pushOk("", { marks: [] })) });
  db.set(Q + NF, { s: "watching", title: "The Boys", kind: "", url: "", at: 1000 });
  const running = w.sync.run();
  await new Promise((r) => setImmediate(r));
  await w.sync.purge();
  release();
  assert.equal(await running, null);
  assert.deepEqual(syncKeys(), []);
});

// ---------- refused marks (400) ----------

function refuseBad(path, body) {
  const bad = body.marks.some((m) => m.platformId.startsWith("bad"));
  return bad ? reply(400, null) : pushOk(path, body);
}
const rec = (title) => ({ s: "plan", title, kind: "", url: "", at: 1000 });

test("a 400 isolates the refused mark and the rest still sync", async () => {
  const w = world({ "/api/v1/sync/push": refuseBad, "/api/v1/sync": pullEmpty });
  for (const id of ["1", "2", "bad", "3", "4"]) db.set(`${Q}t:netflix:${id}`, rec(`T ${id}`));
  const st = await w.sync.run();
  assert.equal(st.state, "ok");
  assert.equal(st.pending, 0);
  assert.equal(st.rejected, 1);
  assert.deepEqual(queueOf(), []);
  assert.equal(db.get("sync:rejected:t:netflix:bad").title, "T bad");
  assert.deepEqual(Object.keys(db.get("sync:ids")).sort(), [
    "t:netflix:1",
    "t:netflix:2",
    "t:netflix:3",
    "t:netflix:4",
  ]);
});

test("when every mark is refused, all are parked and the run still finishes", async () => {
  const w = world({ "/api/v1/sync/push": refuseBad, "/api/v1/sync": pullEmpty });
  for (const id of ["bad1", "bad2", "bad3"]) db.set(`${Q}t:netflix:${id}`, rec(id));
  const st = await w.sync.run();
  assert.equal(st.state, "ok");
  assert.equal(st.rejected, 3);
  assert.deepEqual(queueOf(), []);
});

test("Retry puts refused marks back in the queue, never over a newer change", async () => {
  const w = world();
  db.set("sync:rejected:t:netflix:1", rec("Old one"));
  db.set("sync:rejected:t:netflix:2", rec("Two"));
  db.set(`${Q}t:netflix:1`, { ...rec("Newer"), at: 5000 });
  await w.sync.requeue();
  assert.deepEqual(syncKeys().sort(), [`${Q}t:netflix:1`, `${Q}t:netflix:2`, "sync:seeded"]);
  assert.equal(db.get(`${Q}t:netflix:1`).title, "Newer");
  assert.equal(db.get(`${Q}t:netflix:2`).title, "Two");
});
