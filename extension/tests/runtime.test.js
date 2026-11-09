"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

const db = new Map();
let failSet = false;
let setCalls = 0;
let failAt = 0;
globalThis.chrome = {
  runtime: { id: "x" },
  storage: {
    onChanged: { addListener() {} },
    local: {
      async get() {
        return Object.fromEntries(db);
      },
      async set(o) {
        setCalls++;
        if (failSet || setCalls === failAt) throw new Error("quota");
        for (const [k, v] of Object.entries(o)) db.set(k, structuredClone(v));
      },
      async remove(keys) {
        for (const k of keys) db.delete(k);
      },
    },
  },
};
require("../core/states.js");
require("../core/store.js");
const D = globalThis.Dogear;

const NF = "t:netflix:1111111";
const PV = "t:primevideo:B000000001";
const HB = "t:hbomax:f0ba7b8f-1234-4abc-9def-0123456789ab";

async function fresh(extra = {}) {
  failSet = false;
  db.clear();
  db.set(NF, { s: "plan", title: "The Boys", at: 1 });
  db.set(PV, { s: "plan", title: "The Boys - Season 1", at: 1 });
  for (const [k, v] of Object.entries(extra)) db.set(k, v);
  await D.store.load();
  await D.store.setSettings({ match: true });
  setCalls = 0;
  failAt = 0;
}

test("set links entries with the same title; null clears them", async () => {
  await fresh();
  assert.equal(await D.store.set(NF, "completed", { title: "The Boys" }), true);
  for (const k of [NF, PV]) {
    assert.equal(D.store.get(k).s, "completed");
    assert.equal(db.get(k).s, "completed");
  }
  assert.equal(await D.store.set(NF, null, { title: "The Boys" }), true);
  for (const k of [NF, PV]) {
    assert.equal(D.store.get(k), undefined);
    assert.equal(db.has(k), false);
  }
});

test("resolve links unmarked keys by title; match:false disables", async () => {
  await fresh();
  assert.equal(D.store.get(HB), undefined);
  assert.equal(D.store.settings().match, true);
  const r = D.store.resolve(HB, "The Boys");
  assert.ok(r);
  assert.equal(r.s, "plan");
  assert.ok(r.title.startsWith("The Boys"));
  await D.store.setSettings({ match: false });
  assert.equal(D.store.resolve(HB, "The Boys"), undefined);
});

test("set links by both passed and stored title; keeps stored title", async () => {
  await fresh();
  assert.equal(await D.store.set(NF, "hold", { title: "Boys, The (Extended)" }), true);
  assert.equal(D.store.get(PV).s, "hold");
  assert.equal(D.store.get(NF).s, "hold");
  assert.equal(D.store.get(NF).title, "The Boys");
});

test("partial chunk failure: cache matches what storage holds", async () => {
  await fresh();
  const writes = {};
  for (let i = 0; i < 600; i++) {
    const k = `t:netflix:${1000000 + i}`;
    writes[k] = D.validEntry(k, { s: "plan", title: `Show ${i}`, at: 5 });
  }
  failAt = 2;
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(await D.store.writeMany(writes), false);
  } finally {
    console.warn = warn;
  }
  const stored = [...db.keys()].filter((k) => k !== "settings");
  assert.ok(stored.length > 2);
  assert.ok(stored.length < 602);
  assert.equal(D.store.entries().size, stored.length);
  for (const k of stored) assert.ok(D.store.get(k), k);
});

test("rejected storage write returns false and rolls back the cache", async () => {
  await fresh();
  const before = structuredClone(D.store.get(NF));
  const beforePv = structuredClone(D.store.get(PV));
  failSet = true;
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(await D.store.set(NF, "completed", { title: "The Boys" }), false);
  } finally {
    console.warn = warn;
  }
  assert.deepEqual(D.store.get(NF), before);
  assert.deepEqual(D.store.get(PV), beforePv);
});

test("invalid state or key writes nothing", async () => {
  await fresh();
  const snap = JSON.stringify([...db]);
  assert.equal(await D.store.set(NF, "bogus"), false);
  assert.equal(await D.store.set("t:nope:1", "plan"), false);
  assert.equal(await D.store.set("__proto__", "plan"), false);
  assert.equal(JSON.stringify([...db]), snap);
  assert.equal(D.store.get(NF).s, "plan");
});

test("load drops invalid stored values", async () => {
  await fresh({
    "t:netflix:2222222": { s: "bogus" },
    "t:netflix:3333333": null,
    "t:nope:1": { s: "plan" },
    "t:netflix:4444444": [],
  });
  assert.ok(D.store.get(NF));
  for (const k of ["t:netflix:2222222", "t:netflix:3333333", "t:nope:1", "t:netflix:4444444"]) {
    assert.equal(D.store.get(k), undefined, k);
  }
  assert.equal(D.store.entries().size, 2);
});
