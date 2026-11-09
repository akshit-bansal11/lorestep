"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
require("../core/states.js");
require("../core/store.js");
for (const n of ["netflix", "primevideo", "hotstar", "zee5", "hbomax", "crunchyroll"]) require(`../adapters/${n}.js`);
const D = globalThis.Dogear;
const A = (p) => D.adapters.find((a) => a.platform === p);
const U = (s) => new URL(s);
const keyOk = (p, id) => assert.ok(D.parseKey(D.makeKey(p, id)), `${p}:${id}`);

test("netflix", () => {
  const a = A("netflix");
  assert.equal(a.match(U("https://www.netflix.com/watch/80057281?tctx=1")).id, "80057281");
  assert.equal(a.match(U("https://www.netflix.com/title/80057281")).id, "80057281");
  assert.equal(a.match(U("https://www.netflix.com/browse")), null);
  assert.equal(a.detail(U("https://www.netflix.com/browse?jbv=80057281")).id, "80057281");
  assert.equal(a.detail(U("https://www.netflix.com/watch/80057281")), null);
  assert.equal(
    a.canonical("80057281", U("https://www.netflix.com/watch/80057281")),
    "https://www.netflix.com/title/80057281",
  );
  keyOk("netflix", "80057281");
});

test("primevideo", () => {
  const a = A("primevideo");
  const id = "0QSNMFLV8AJOZAK2TDMYD8RCXW";
  const u = U(`https://www.primevideo.com/detail/${id}/ref=atv_hm`);
  assert.equal(a.match(u).id, id);
  const c = a.canonical(id, u);
  assert.ok(c.endsWith(`/detail/${id}`));
  assert.ok(!c.includes("ref="));
  assert.equal(a.match(U("https://www.amazon.com/gp/video/detail/B08WJP55PR/ref=x")).id, "B08WJP55PR");
  assert.equal(
    a.match(U("https://www.primevideo.com/detail/The-Boys/0KRGHGZCHKS920ZQGY5LBRF7MA")).id,
    "0KRGHGZCHKS920ZQGY5LBRF7MA",
  );
  keyOk("primevideo", id);
  keyOk("primevideo", "B08WJP55PR");
});

test("hotstar", () => {
  const a = A("hotstar");
  const u = U("https://www.hotstar.com/in/shows/the-night-manager/1260128358/episode-1/1260128359/watch");
  const m = a.match(u);
  assert.equal(m.id, "1260128358");
  assert.equal(m.kind, "series");
  assert.ok(a.canonical(m.id, u).endsWith("/1260128358"));
  assert.equal(a.match(U("https://www.hotstar.com/in/movies/jawan/1260155777")).kind, "movie");
  keyOk("hotstar", m.id);
});

test("zee5", () => {
  const a = A("zee5");
  const s = a.match(U("https://www.zee5.com/web-series/details/sunflower/0-6-4z5208838"));
  assert.equal(s.id, "0-6-4z5208838");
  assert.equal(s.kind, "series");
  assert.equal(a.match(U("https://www.zee5.com/movies/details/rrr/0-0-1z5170000")).kind, "movie");
  keyOk("zee5", s.id);
});

test("hbomax", () => {
  const a = A("hbomax");
  const uuid = "F0BA7B8F-1234-4ABC-9DEF-0123456789AB";
  const u = U(`https://play.hbomax.com/show/${uuid}`);
  const m = a.match(u);
  assert.equal(m.id, uuid.toLowerCase());
  assert.equal(m.kind, "series");
  assert.equal(a.match(U(`https://play.hbomax.com/movie/${uuid}`)).kind, "movie");
  const c = a.canonical(m.id, u);
  assert.equal(c, c.toLowerCase());
  keyOk("hbomax", m.id);
});

test("crunchyroll", () => {
  const a = A("crunchyroll");
  assert.equal(a.match(U("https://www.crunchyroll.com/series/GY5P48XEY/demon-slayer")).id, "GY5P48XEY");
  assert.equal(a.match(U("https://www.crunchyroll.com/es/series/GY5P48XEY")).id, "GY5P48XEY");
  assert.equal(a.match(U("https://www.crunchyroll.com/watch/GEVUZD9DM/x")), null);
  keyOk("crunchyroll", "GY5P48XEY");

  // Episode page: the series comes from the header's show-title link, not the URL.
  const watch = U("https://www.crunchyroll.com/watch/GEVUZD9DM/x");
  assert.equal(a.detail(watch), null); // no document, no link
  globalThis.document = {
    querySelector: () => ({
      href: "https://www.crunchyroll.com/series/GY5P48XEY/demon-slayer",
      textContent: "Demon Slayer",
    }),
  };
  try {
    assert.equal(a.detail(watch).id, "GY5P48XEY");
    assert.equal(a.pageTitle(), "Demon Slayer");
    globalThis.document = { querySelector: () => ({ href: "https://evil.example/series/notvalid" }) };
    assert.equal(a.detail(watch), null);
  } finally {
    delete globalThis.document;
  }
});
