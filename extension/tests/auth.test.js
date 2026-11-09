"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
require("../core/states.js");
require("../core/store.js");
require("../core/auth.js");
const D = globalThis.Lorestep;

const ORIGIN = "https://lorestep.akshitbansal.dev";
const SYNC = `${ORIGIN}/api/v1/sync`;
const TOKEN = D.authEndpoint("token");
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
    id_token: idToken({ email: "ana@example.com" }),
    ...extra,
  });
const stateOf = (url) => new URL(url).searchParams.get("state");
/** The provider approving: echoes the state from the authorize URL back on the redirect URI. */
const approve = (url) => `${REDIRECT}?code=c0de&state=${stateOf(url)}`;
const EVIL = "https://hemmdilibbhbbgionnnfloeilhkiijop.chromiumapp.org.evil.example/";

/** A fake world: storage, a scripted fetch (one reply per call, by URL), a sign-in window, a clock. */
function world(script = {}, opts = {}) {
  const db = new Map();
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
  const auth = D.makeAuth({
    fetch,
    storage,
    redirectUri: REDIRECT,
    clientId: "clientId" in opts ? opts.clientId : CLIENT,
    launchFlow: async (url) => {
      opened.push(url);
      return (opts.flow || approve)(url);
    },
    now: () => clock.t,
  });
  return { auth, db, calls, opened, clock };
}
const form = (call) => Object.fromEntries(new URLSearchParams(call.init.body));
const signedIn = (w, expiresAt = T0 + 3600000) =>
  w.db.set("auth", { accessToken: "at0", refreshToken: "rt0", expiresAt, email: "ana@example.com" });

test("PKCE S256 matches the RFC 7636 appendix B vector", async () => {
  assert.equal(
    await D.pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
});

test("authorizeUrl carries every parameter the contract names", () => {
  const u = new URL(D.authorizeUrl({ clientId: CLIENT, redirectUri: REDIRECT, state: "st", challenge: "ch" }));
  assert.equal(`${u.origin}${u.pathname}`, D.authEndpoint("authorize"));
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

test("sign-in: code + PKCE exchange stores the tokens and shows the id_token email", async () => {
  const w = world({ [TOKEN]: tokens(1) });
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
  assert.deepEqual(w.db.get("auth"), {
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
  const w = world({ [TOKEN]: [tokens(1), tokens(2)] });
  await w.auth.signIn();
  await w.auth.signIn();
  const states = w.opened.map((u) => new URL(u).searchParams.get("state"));
  assert.notEqual(states[0], states[1]);
  assert.notEqual(form(w.calls[0]).code_verifier, form(w.calls[1]).code_verifier);
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
    assert.equal(w.db.has("auth"), false);
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
  assert.equal(w.db.has("auth"), false);
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
    assert.equal(w.db.has("auth"), false);
    assert.equal(w.db.get("auth:status").state, "error");
  }
});

test("sign-in: an unusable id_token email is dropped, the sign-in kept", async () => {
  const w = world({ [TOKEN]: tokens(1, { id_token: idToken({ email: "a‮b@example.com" }) }) });
  await w.auth.signIn();
  assert.deepEqual(w.db.get("auth:status"), { state: "signed-in", email: "" });
  assert.equal(D.idTokenEmail("not a jwt"), "");
  assert.equal(D.idTokenEmail(undefined), "");
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
      seen = w.db.get("auth");
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
  const w = world({ [TOKEN]: tokens(1, { refresh_token: undefined, id_token: undefined }), [SYNC]: reply(200, {}) });
  signedIn(w, T0);
  await w.auth.call("/api/v1/sync");
  assert.equal(w.db.get("auth").refreshToken, "rt0");
  assert.equal(w.db.get("auth").email, "ana@example.com");
});

test("concurrent calls share one refresh", async () => {
  const w = world({ [TOKEN]: tokens(1), [SYNC]: [reply(200, {}), reply(200, {})] });
  signedIn(w, T0);
  await Promise.all([w.auth.call("/api/v1/sync"), w.auth.call("/api/v1/sync")]);
  assert.equal(w.calls.filter((c) => c.url === TOKEN).length, 1);
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
  assert.equal(w.db.has("auth"), false);
  assert.equal(w.db.get("auth:status").state, "signed-out");
  assert.equal(await w.auth.signedIn(), false);
});

test("invalid_grant on refresh signs out and sends nothing to Lorestep", async () => {
  const w = world({ [TOKEN]: reply(400, { error: "invalid_grant" }) });
  signedIn(w, T0);
  assert.equal(await w.auth.call("/api/v1/sync"), null);
  assert.equal(w.db.has("auth"), false);
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
  assert.equal(w.db.get("auth").refreshToken, "rt0");
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
  assert.equal(w.db.has("auth"), false);
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
  assert.equal(w.db.has("auth"), false);
  assert.equal(w.db.get("auth:status").state, "signed-out");
  assert.equal(w.calls.length, 0);
});

test("an old device-flow token reads as signed out and is deleted", async () => {
  const w = world();
  w.db.set("auth", { token: "tok.sig", email: "", at: 1, expiresAt: Number.MAX_SAFE_INTEGER });
  w.db.set("auth:status", { state: "signed-in", email: "" });
  assert.equal((await w.auth.status()).state, "signed-out");
  assert.equal(w.db.has("auth"), false);
  assert.equal(w.calls.length, 0);
});

test("a waiting status with no sign-in running reads as interrupted", async () => {
  const w = world();
  w.db.set("auth:status", { state: "waiting" });
  assert.equal((await w.auth.status()).state, "error");
});
