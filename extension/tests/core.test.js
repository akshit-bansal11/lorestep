"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
require("../core/states.js");
require("../core/store.js");
const D = globalThis.Dogear;

test("parseKey accepts a valid key", () => {
  assert.deepEqual(D.parseKey("t:netflix:80057281"), { platform: "netflix", id: "80057281" });
});

test("parseKey rejects bad keys", () => {
  for (const bad of [
    "t:unknown:123",
    "t:netflix:a b",
    "__proto__",
    `t:netflix:${"a".repeat(129)}`,
    null,
    undefined,
    42,
    {},
    ["t:netflix:1"],
  ]) {
    assert.equal(D.parseKey(bad), null, String(bad));
  }
  assert.ok(D.parseKey(`t:netflix:${"a".repeat(128)}`));
});

const NOW = 1_700_000_000_000;
const K = "t:netflix:80057281";

test("validEntry rejects non-objects and bad states", () => {
  for (const v of [null, undefined, [], "x", 1, { s: "nope" }, { title: "x" }, { s: "__proto__" }]) {
    assert.equal(D.validEntry(K, v, NOW), null);
  }
  assert.equal(D.validEntry("bad", { s: "plan" }, NOW), null);
});

test("validEntry cleans the title", () => {
  const e = D.validEntry(K, { s: "plan", title: "a‮b​c\u0000d" }, NOW);
  assert.ok(![...e.title].some((c) => [0x202e, 0x200b].includes(c.charCodeAt(0)) || c.charCodeAt(0) < 0x20));
  assert.equal(D.validEntry(K, { s: "plan", title: "x".repeat(300) }, NOW).title.length, 200);
});

test("validEntry url rules", () => {
  const u = (url) => D.validEntry(K, { s: "plan", url }, NOW).url;
  assert.equal(u("https://www.netflix.com/title/1?a=b#c"), "https://www.netflix.com/title/1");
  for (const bad of [
    "http://www.netflix.com/title/1",
    "javascript:alert(1)",
    "https://evil.example.com/title/1",
    "https://user:pw@www.netflix.com/",
    "not a url",
    undefined,
  ]) {
    assert.equal(u(bad), "", String(bad));
  }
});

test("validEntry at and kind", () => {
  const at = (v) => D.validEntry(K, { s: "plan", at: v }, NOW).at;
  assert.equal(at(NOW + 99999), NOW);
  assert.equal(at(Infinity), 0);
  assert.equal(at(NaN), 0);
  assert.equal(at(-5), 0);
  assert.equal(at("12"), 0);
  assert.equal(at(1234), 1234);
  assert.equal(D.validEntry(K, { s: "plan", kind: "podcast" }, NOW).kind, "");
  assert.equal(D.validEntry(K, { s: "plan", kind: "movie" }, NOW).kind, "movie");
});

test("normTitle", () => {
  for (const t of ["The Boys - Season 1", "The Boys (Hindi)", "THE BOYS: S2", "The Boys — Season 3 Episode 2"]) {
    assert.equal(D.normTitle(t), "the boys", t);
  }
  assert.equal(D.normTitle("Dune: Part Two"), "dune part two");
  assert.equal(D.normTitle("Amélie"), "amelie");
  assert.equal(D.normTitle("Tom & Jerry"), "tom and jerry");
  for (const t of ["", "A", "   "]) assert.equal(D.normTitle(t), "");
});

test("normTitle keeps Indic vowel signs, strips Latin/Cyrillic accents", () => {
  const a = D.normTitle("काल");
  const b = D.normTitle("किल");
  const c = D.normTitle("कुल");
  for (const x of [a, b, c]) assert.notEqual(x, "");
  assert.equal(new Set([a, b, c]).size, 3);
  assert.equal(D.normTitle("Amélie"), "amelie");
  assert.equal(D.normTitle("Ёлки"), "елки");
});

test("planImport errors when over MAX_STORE_BYTES", () => {
  const orig = D.MAX_STORE_BYTES;
  D.MAX_STORE_BYTES = 10;
  try {
    const existing = new Map([["t:netflix:1111111", { s: "plan", title: "A", kind: "", url: "", at: 1 }]]);
    const r = D.planImport(exp({ "t:netflix:2222222": { s: "plan", title: "B", at: 5 } }), existing, NOW);
    assert.ok(r.error);
  } finally {
    D.MAX_STORE_BYTES = orig;
  }
  const ok = D.planImport(exp({ "t:netflix:2222222": { s: "plan", title: "B", at: 5 } }), new Map(), NOW);
  assert.equal(ok.error, undefined);
});

const exp = (titles) => JSON.stringify({ format: "dogear", version: 1, titles });

test("planImport errors", () => {
  assert.ok(D.planImport("{nope", new Map(), NOW).error);
  assert.ok(D.planImport(JSON.stringify({ format: "other", version: 1, titles: {} }), new Map(), NOW).error);
  assert.ok(D.planImport(JSON.stringify({ format: "dogear", version: 2, titles: {} }), new Map(), NOW).error);
  assert.ok(D.planImport(JSON.stringify({ format: "dogear", version: 1, titles: [] }), new Map(), NOW).error);
  assert.ok(D.planImport(JSON.stringify({ format: "dogear", version: 1 }), new Map(), NOW).error);
  const big = {};
  for (let i = 0; i <= D.MAX_IMPORT_TITLES; i++) big[`k${i}`] = 1;
  assert.ok(D.planImport(exp(big), new Map(), NOW).error);
});

test("planImport counts skipped, older, and writes newer", () => {
  const existing = new Map([
    ["t:netflix:1111111", { s: "plan", title: "A", kind: "", url: "", at: 50 }],
    ["t:netflix:2222222", { s: "plan", title: "B", kind: "", url: "", at: 50 }],
  ]);
  const r = D.planImport(
    exp({
      "t:netflix:1111111": { s: "completed", title: "A", at: 50 },
      "t:netflix:2222222": { s: "completed", title: "B", at: 60 },
      "t:netflix:3333333": { s: "plan", title: "C", at: 10 },
      "t:netflix:4444444": { s: "bogus" },
      "bad key": { s: "plan" },
    }),
    existing,
    NOW,
  );
  assert.equal(r.skipped, 2);
  assert.equal(r.older, 1);
  assert.deepEqual(Object.keys(r.writes).sort(), ["t:netflix:2222222", "t:netflix:3333333"]);
  assert.equal(r.writes["t:netflix:2222222"].s, "completed");
});

test("planImport ignores __proto__ and never removes", () => {
  const before = Object.getOwnPropertyNames(Object.prototype).sort();
  const text = '{"format":"dogear","version":1,"titles":{"__proto__":{"s":"plan","polluted":true}}}';
  const r = D.planImport(text, new Map([["t:netflix:1111111", { s: "plan", at: 1 }]]), NOW);
  assert.equal(r.skipped, 1);
  assert.deepEqual(r.writes, {});
  assert.equal({}.polluted, undefined);
  assert.deepEqual(Object.getOwnPropertyNames(Object.prototype).sort(), before);
  assert.equal(r.remove, undefined);
  assert.equal(r.removes, undefined);
});

test("toExport -> planImport round-trips", () => {
  const src = new Map();
  for (const [k, v] of [
    [
      "t:netflix:1111111",
      { s: "plan", title: "The Boys", kind: "series", url: "https://www.netflix.com/title/1111111", at: 5 },
    ],
    ["t:hotstar:1260128358", { s: "completed", title: "Night Manager", kind: "", url: "", at: 9 }],
  ])
    src.set(k, D.validEntry(k, v, NOW));
  const r = D.planImport(D.toExport(src.entries(), NOW), new Map(), NOW);
  assert.equal(r.skipped, 0);
  assert.equal(r.older, 0);
  assert.deepEqual(r.writes, Object.fromEntries(src));
});

test("NEXT shape and two-click reachability", () => {
  const nodes = ["none", ...D.ORDER];
  for (const n of nodes) {
    assert.equal(D.NEXT[n].length, 3, n);
    for (const [label, target] of D.NEXT[n]) {
      assert.equal(typeof label, "string");
      assert.ok(target === null || D.isState(target), `${n}->${target}`);
    }
  }
  const step = (n) => D.NEXT[n].map(([, t]) => t ?? "none");
  for (const from of nodes) {
    const reach = new Set(step(from));
    for (const m of [...reach]) for (const x of step(m)) reach.add(x);
    for (const to of nodes) if (to !== from) assert.ok(reach.has(to), `${from} -> ${to}`);
  }
});

test("WIRE round-trips all five states", () => {
  assert.deepEqual(Object.keys(D.WIRE.to).sort(), [...D.ORDER].sort());
  for (const s of D.ORDER) assert.equal(D.WIRE.from[D.WIRE.to[s]], s);
  assert.equal(Object.keys(D.WIRE.from).length, D.ORDER.length);
});
