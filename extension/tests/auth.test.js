"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
require("../core/states.js");
require("../core/store.js");
require("../core/auth.js");
const D = globalThis.Lorestep;

const ORIGIN = "https://lorestep.akshitbansal.dev";
const SYNC = `${ORIGIN}/api/v1/sync`;
const NEON = "https://ep-noisy-king-bbgaaffj.neonauth.c-15.us-east-1.aws.neon.tech/neondb/auth";
const TOKEN = D.authEndpoint("token");
const USERINFO = D.authEndpoint("userinfo");
const REDIRECT = "https://hemmdilibbhbbgionnnfloeilhkiijop.chromiumapp.org/";
const CLIENT = "extension-client";
const T0 = 1_700_000_000_000;

const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const idToken = (claims) => `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;
const tokens = (n, extra = {}) =>
  reply(200, {
    access_token: `at${n}`,
    refresh_token: `rt${n}`,
    token_type: "Bearer",
    expires_in: 3600,
    id_token: idToken({ sub: "u1" }), // Neon's id_token carries no email
    ...extra,
  });
const me = (email = "ana@example.com") => reply(200, { sub: "u1", email });
const stateOf = (url) => new URL(url).searchParams.get("state");
/** The provider approving: echoes the state from the authorize URL back on the redirect URI. */
const approve = (url) => `${REDIRECT}?code=c0de&state=${stateOf(url)}`;
const EVIL = "https://hemmdilibbhbbgionnnfloeilhkiijop.chromiumapp.org.evil.example/";

/** An in-memory stand-in for the IndexedDB calls D.idbVault makes, over `map`. Requests and
    transactions complete on a later microtask, as in the browser. opts.hold = { n, until }: the n-th
    get answers with what was stored when it was asked, but only once `until` settles (a slow read
    racing a refresh). */
function fakeIdb(map, opts) {
  let gets = 0;
  let created = false;
  const database = {
    createObjectStore() {
      created = true;
    },
    transaction() {
      const pending = [];
      /** Runs `fn` now (a get snapshots at once); its result lands on the request. */
      const op = (fn) => {
        const req = {};
        const done = fn().then((r) => {
          req.result = r;
        });
        pending.push(done);
        return req;
      };
      const store = {
        get(k) {
          return op(async () => {
            const snap = structuredClone(map.get(k));
            if (opts.hold?.n === ++gets) await opts.hold.until;
            return snap;
          });
        },
        put: (v, k) => op(async () => map.set(k, structuredClone(v))),
        delete: (k) => op(async () => map.delete(k)),
      };
      const t = { objectStore: () => store };
      queueMicrotask(() => Promise.all(pending).then(() => t.oncomplete()));
      return t;
    },
  };
  return {
    open() {
      const req = { result: database };
      queueMicrotask(() => {
        if (!created) req.onupgradeneeded();
        req.onsuccess();
      });
      return req;
    },
  };
}

/** A fake world: storage (chrome.storage.local), the token vault (IndexedDB), a scripted fetch (one
    reply per call, by URL), a sign-in window, a clock. */
function world(script = {}, opts = {}) {
  const db = new Map();
  const vault = new Map();
  const calls = [];
  const opened = [];
  const clock = { t: T0 };
  const storage = {
    async get(k) {
      return db.has(k) ? { [k]: structuredClone(db.get(k)) } : {};
    },
    async set(o) {
      for (const [k, v] of Object.entries(o)) db.set(k, structuredClone(v));
    },
    async remove(keys) {
      for (const k of keys) db.delete(k);
    },
  };
  const fetch = async (url, init) => {
    calls.push({ url, init });
    const queue = script[url.split("?")[0]];
    let next = Array.isArray(queue) ? queue.shift() : queue;
    if (typeof next === "function") next = await next(init);
    if (next instanceof Error) throw next;
    if (!next) throw new Error(`unexpected fetch ${url}`);
    return next;
  };
  for (const [k, v] of Object.entries(opts.legacy ?? {})) db.set(k, v);
  const auth = D.makeAuth({
    fetch,
    storage,
    vault: D.idbVault(fakeIdb(vault, opts)),
    redirectUri: REDIRECT,
    clientId: "clientId" in opts ? opts.clientId : CLIENT,
    launchFlow: async (url) => {
      opened.push(url);
      return (opts.flow || approve)(url);
    },
    now: () => clock.t,
  });
  return { auth, db, vault, calls, opened, clock };
}
const form = (call) => Object.fromEntries(new URLSearchParams(call.init.body));
const signedIn = (w, expiresAt = T0 + 3600000) =>
  w.vault.set("auth", { accessToken: "at0", refreshToken: "rt0", expiresAt, email: "ana@example.com" });

test("PKCE S256 matches the RFC 7636 appendix B vector", async () => {
  assert.equal(
    await D.pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
});

test("authorize, token and userinfo go to the Neon Auth base, never Lorestep's /api/auth proxy", () => {
  assert.equal(D.authEndpoint("authorize"), `${NEON}/oauth2/authorize`);
  assert.equal(TOKEN, `${NEON}/oauth2/token`);
  assert.equal(USERINFO, `${NEON}/oauth2/userinfo`);
});

test("authorizeUrl carries every parameter the contract names", () => {
  const u = new URL(D.authorizeUrl({ clientId: CLIENT, redirectUri: REDIRECT, state: "st", challenge: "ch" }));
  assert.equal(`${u.origin}${u.pathname}`, `${NEON}/oauth2/authorize`);
  assert.deepEqual(Object.fromEntries(u.searchParams), {
    response_type: "code",
    client_id: CLIENT,
    redirect_uri: REDIRECT,
    scope: "openid email offline_access",
    resource: SYNC,
    state: "st",
    code_challenge: "ch",
    code_challenge_method: "S256",
  });
});

test("sign-in: code + PKCE exchange stores the tokens and shows the userinfo email", async () => {
  const w = world({ [TOKEN]: tokens(1), [USERINFO]: me() });
  await w.auth.signIn();
  const q = new URL(w.opened[0]).searchParams;
  assert.match(q.get("state"), /^[A-Za-z0-9_-]{43}$/);
  const body = form(w.calls[0]);
  assert.equal(body.grant_type, "authorization_code");
  assert.equal(body.code, "c0de");
  assert.equal(body.redirect_uri, REDIRECT);
  assert.equal(body.client_id, CLIENT);
  assert.equal(body.resource, SYNC);
  assert.match(body.code_verifier, /^[A-Za-z0-9_-]{64}$/);
  assert.equal(await D.pkceChallenge(body.code_verifier), q.get("code_challenge"));
  assert.equal(w.calls[0].init.credentials, "omit");
  assert.equal(w.calls[1].url, USERINFO);
  assert.equal(w.calls[1].init.headers.authorization, "Bearer at1");
  assert.equal(w.calls[1].init.credentials, "omit");
  assert.deepEqual(w.vault.get("auth"), {
    accessToken: "at1",
    refreshToken: "rt1",
    expiresAt: T0 + 3600000,
    email: "ana@example.com",
  });
  assert.deepEqual(w.db.get("auth:status"), { state: "signed-in", email: "ana@example.com" });
  // The library-facing status never carries a token.
  assert.doesNotMatch(JSON.stringify(await w.auth.status()), /at1|rt1/);
});

test("sign-in: two attempts use different state and verifier", async () => {
  const w = world({ [TOKEN]: [tokens(1), tokens(2)], [USERINFO]: [me(), me()] });
  await w.auth.signIn();
  await w.auth.signIn();
  const states = w.opened.map((u) => new URL(u).searchParams.get("state"));
  assert.notEqual(states[0], states[1]);
  const [a, b] = w.calls.filter((c) => c.url === TOKEN).map(form);
  assert.notEqual(a.code_verifier, b.code_verifier);
});

test("sign-in: a wrong state or a foreign redirect is refused before any token request", async () => {
  for (const flow of [
    () => `${REDIRECT}?code=c0de&state=forged`,
    () => `${REDIRECT}?code=c0de`,
    (u) => `https://evil.example/?code=c0de&state=${stateOf(u)}`,
    (u) => `${EVIL}?code=c0de&state=${stateOf(u)}`,
  ]) {
    const w = world({}, { flow });
    await w.auth.signIn();
    assert.equal(w.calls.length, 0);
    assert.equal(w.vault.has("auth"), false);
    assert.equal(w.db.get("auth:status").state, "error");
  }
});

test("sign-in: error=access_denied shows denied", async () => {
  const w = world({}, { flow: (u) => `${REDIRECT}?error=access_denied&state=${stateOf(u)}` });
  await w.auth.signIn();
  assert.equal(w.db.get("auth:status").state, "denied");
  assert.equal(w.calls.length, 0);
});

test("sign-in: a closed window changes nothing", async () => {
  const closed = () => {
    throw new Error("The user did not approve access.");
  };
  const w = world({}, { flow: closed });
  await w.auth.signIn();
  assert.equal(w.db.get("auth:status").state, "signed-out");
  assert.equal(w.vault.has("auth"), false);
});

test("sign-in: an unusable token reply stores nothing", async () => {
  for (const bad of [
    tokens(1, { token_type: "mac" }),
    tokens(1, { refresh_token: undefined }),
    tokens(1, { access_token: "a b" }),
    reply(400, { error: "invalid_grant" }),
  ]) {
    const w = world({ [TOKEN]: bad });
    await w.auth.signIn();
    assert.equal(w.vault.has("auth"), false);
    assert.equal(w.db.get("auth:status").state, "error");
  }
});

test("sign-in: an unusable or unreachable userinfo email is dropped, the sign-in kept", async () => {
  for (const info of [me("a‮b@example.com"), me(42), reply(401, null), reply(200, null), new TypeError("offline")]) {
    const w = world({ [TOKEN]: tokens(1), [USERINFO]: info });
    await w.auth.signIn();
    assert.deepEqual(w.db.get("auth:status"), { state: "signed-in", email: "" });
    assert.equal(w.vault.get("auth").refreshToken, "rt1");
  }
});

test("empty client_id: sign-in says the extension isn't registered and makes no request", async () => {
  const w = world({}, { clientId: "" });
  await w.auth.signIn();
  assert.deepEqual(w.opened, []);
  assert.equal(w.calls.length, 0);
  assert.match(w.db.get("auth:status").message, /isn't registered with Lorestep yet/);
});

test("refresh before expiry: the new pair is stored before the request that uses it", async () => {
  let seen = null;
  const w = world({
    [TOKEN]: tokens(1),
    [SYNC]: () => {
      seen = w.vault.get("auth");
      return reply(200, {});
    },
  });
  signedIn(w, T0 + 30000); // under a minute left
  assert.equal((await w.auth.call("/api/v1/sync")).status, 200);
  const body = form(w.calls[0]);
  assert.deepEqual(
    { grant_type: body.grant_type, refresh_token: body.refresh_token, client_id: body.client_id },
    { grant_type: "refresh_token", refresh_token: "rt0", client_id: CLIENT },
  );
  assert.equal(seen.refreshToken, "rt1");
  assert.equal(w.calls[1].init.headers.authorization, "Bearer at1");
  assert.equal(w.calls[1].init.credentials, "omit");
});

test("a refresh reply without refresh_token keeps the old one", async () => {
  const w = world({ [TOKEN]: tokens(1, { refresh_token: undefined }), [SYNC]: reply(200, {}) });
  signedIn(w, T0);
  await w.auth.call("/api/v1/sync");
  assert.equal(w.vault.get("auth").refreshToken, "rt0");
  assert.equal(w.vault.get("auth").email, "ana@example.com");
});

test("concurrent calls share one refresh", async () => {
  const w = world({ [TOKEN]: tokens(1), [SYNC]: [reply(200, {}), reply(200, {})] });
  signedIn(w, T0);
  await Promise.all([w.auth.call("/api/v1/sync"), w.auth.call("/api/v1/sync")]);
  assert.equal(w.calls.filter((c) => c.url === TOKEN).length, 1);
});

const presented = (w) => w.calls.filter((c) => c.url === TOKEN).map((c) => form(c).refresh_token);

test("single flight: three concurrent 401s present the refresh token once", async () => {
  const w = world({
    [TOKEN]: tokens(1),
    [SYNC]: [reply(401, null), reply(401, null), reply(401, null), reply(200, {}), reply(200, {}), reply(200, {})],
  });
  signedIn(w);
  const res = await Promise.all([1, 2, 3].map(() => w.auth.call("/api/v1/sync")));
  assert.deepEqual(
    res.map((r) => r.status),
    [200, 200, 200],
  );
  assert.deepEqual(presented(w), ["rt0"]);
  assert.equal(w.vault.get("auth").refreshToken, "rt1");
});

test("single flight: a caller that read the old pair never re-presents the rotated refresh token", async () => {
  let release;
  // The second token read (caller B's) answers with the old pair only after A's refresh is done.
  const hold = {
    n: 2,
    until: new Promise((r) => {
      release = r;
    }),
  };
  const w = world({ [TOKEN]: tokens(1), [SYNC]: [reply(200, {}), reply(200, {})] }, { hold });
  signedIn(w, T0); // expired: both callers want a refresh
  const a = w.auth.call("/api/v1/sync");
  const b = w.auth.call("/api/v1/sync");
  await a;
  release();
  assert.equal((await b).status, 200);
  assert.deepEqual(presented(w), ["rt0"]);
  assert.equal(w.calls.at(-1).init.headers.authorization, "Bearer at1");
  assert.equal(await w.auth.signedIn(), true);
});

test("a 401 refreshes once and retries with the new token", async () => {
  const w = world({ [TOKEN]: tokens(1), [SYNC]: [reply(401, null), reply(200, {})] });
  signedIn(w);
  assert.equal((await w.auth.call("/api/v1/sync")).status, 200);
  assert.deepEqual(
    w.calls.map((c) => c.init.headers.authorization ?? c.url),
    ["Bearer at0", TOKEN, "Bearer at1"],
  );
});

test("a 401 after the refresh deletes the tokens and shows signed out", async () => {
  const w = world({ [TOKEN]: tokens(1), [SYNC]: [reply(401, null), reply(401, null)] });
  signedIn(w);
  w.db.set("auth:status", { state: "signed-in", email: "" });
  assert.equal((await w.auth.call("/api/v1/sync")).status, 401);
  assert.equal(w.vault.has("auth"), false);
  assert.equal(w.db.get("auth:status").state, "signed-out");
  assert.equal(await w.auth.signedIn(), false);
});

test("invalid_grant on refresh signs out and sends nothing to Lorestep", async () => {
  const w = world({ [TOKEN]: reply(400, { error: "invalid_grant" }) });
  signedIn(w, T0);
  assert.equal(await w.auth.call("/api/v1/sync"), null);
  assert.equal(w.vault.has("auth"), false);
  assert.equal(w.db.get("auth:status").state, "signed-out");
  assert.deepEqual(
    w.calls.map((c) => c.url),
    [TOKEN],
  );
});

test("offline refresh keeps the tokens and throws so sync backs off", async () => {
  const w = world({ [TOKEN]: [new TypeError("Failed to fetch"), reply(503, null)] });
  signedIn(w, T0);
  await assert.rejects(w.auth.call("/api/v1/sync"));
  await assert.rejects(w.auth.call("/api/v1/sync"));
  assert.equal(w.vault.get("auth").refreshToken, "rt0");
  assert.equal(await w.auth.signedIn(), true);
});

test("signed out: no request at all", async () => {
  const w = world();
  assert.equal(await w.auth.call("/api/v1/sync"), null);
  assert.deepEqual(await w.auth.status(), { state: "signed-out" });
  assert.equal(await w.auth.signedIn(), false);
  assert.equal(w.calls.length, 0);
});

test("sign-out deletes the tokens and makes no request", async () => {
  const w = world();
  signedIn(w);
  assert.deepEqual(await w.auth.signOut(), { ok: true, signedOut: true });
  assert.equal(w.vault.has("auth"), false);
  assert.equal(w.db.get("auth:status").state, "signed-out");
  assert.deepEqual(await w.auth.signOut(), { ok: true, signedOut: false });
  assert.equal(w.calls.length, 0);
});

test("sign-out during a sign-in discards the result", async () => {
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  const w = world({ [TOKEN]: tokens(1) }, { flow: (u) => gate.then(() => approve(u)) });
  const running = w.auth.signIn();
  while (!w.opened.length) await new Promise((r) => setImmediate(r));
  await w.auth.signOut();
  release();
  await running;
  assert.equal(w.vault.has("auth"), false);
  assert.equal(w.db.get("auth:status").state, "signed-out");
  assert.equal(w.calls.length, 0);
});

test("an old device-flow token reads as signed out and is deleted", async () => {
  const w = world();
  w.vault.set("auth", { token: "tok.sig", email: "", at: 1, expiresAt: Number.MAX_SAFE_INTEGER });
  w.db.set("auth:status", { state: "signed-in", email: "" });
  assert.equal((await w.auth.status()).state, "signed-out");
  assert.equal(w.vault.has("auth"), false);
  assert.equal(w.calls.length, 0);
});

test("a waiting status with no sign-in running reads as interrupted", async () => {
  const w = world();
  w.db.set("auth:status", { state: "waiting" });
  assert.equal((await w.auth.status()).state, "error");
});

test("tokens live in the vault: chrome.storage.local only ever holds the status", async () => {
  const w = world({ [TOKEN]: tokens(1), [USERINFO]: me() });
  await w.auth.signIn();
  assert.equal(w.vault.get("auth").accessToken, "at1");
  assert.deepEqual([...w.db.keys()], ["auth:status"]);
  assert.doesNotMatch(JSON.stringify([...w.db.values()]), /at1|rt1/);
});

test("a legacy token in chrome.storage.local moves to the vault and the key is deleted", async () => {
  const legacy = { accessToken: "at0", refreshToken: "rt0", expiresAt: T0 + 3600000, email: "ana@example.com" };
  const w = world({ [SYNC]: reply(200, {}) }, { legacy: { auth: legacy } });
  assert.equal(await w.auth.signedIn(), true);
  assert.equal(w.db.has("auth"), false);
  assert.deepEqual(w.vault.get("auth"), legacy);
  assert.equal((await w.auth.call("/api/v1/sync")).status, 200);
  assert.equal(w.calls[0].init.headers.authorization, "Bearer at0");
});

test("every token, userinfo and sync fetch refuses redirects", async () => {
  const w = world({
    [TOKEN]: [tokens(1), tokens(2)],
    [USERINFO]: me(),
    [SYNC]: [reply(401, null), reply(200, {})],
  });
  await w.auth.signIn();
  assert.equal((await w.auth.call("/api/v1/sync")).status, 200);
  const urls = w.calls.map((c) => c.url);
  assert.deepEqual(urls, [TOKEN, USERINFO, SYNC, TOKEN, SYNC]);
  for (const c of w.calls) assert.equal(c.init.redirect, "error", c.url);
});
