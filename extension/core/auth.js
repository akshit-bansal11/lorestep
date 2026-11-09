/* Lorestep for Chrome auth: sign in to Lorestep with OAuth 2.1 authorization code + PKCE, Neon Auth as the
   provider (lorestep docs/EXTENSION.md, PLAN.md section 12, N-12). Only background.js calls makeAuth.
   Loads after core/store.js, which names the storage keys.
   Tokens live in the worker's IndexedDB ("lorestep-auth", D.idbVault), never in chrome.storage.local:
   content scripts on the streaming sites read chrome.storage.local wholesale, but they run in the
   page's origin, so the extension-origin IndexedDB is out of their reach. Tokens leave the worker only
   as an Authorization header to Lorestep or Neon userinfo, or a form body to the token endpoint; they
   are never logged and never put in a message.
   chrome.storage.local holds only "auth:status" (state, email, message); the library reads it, never a token.
   While signed out nothing here touches the network, except the sign-in the user starts. */
(() => {
  "use strict";
  globalThis.Lorestep ??= {};
  const D = globalThis.Lorestep;

  const ORIGIN = "https://lorestep.akshitbansal.dev";
  // The extension's public OAuth client, registered with Neon Auth on 2026-11-09 (lorestep PLAN 12.4).
  // Public client: no secret; PKCE protects the code exchange.
  const CLIENT_ID = "QHsrHeWAKSsEaVpDisiAwJBAdMXtMNvX";
  // Authorize, token and userinfo all go to the Neon Auth base directly (option A, docs/EXTENSION.md
  // "Sign-in"), never Lorestep's /api/auth proxy: the proxy follows Neon's 302 on the server, so the
  // browser would never reach the login page. Its origin is in host_permissions.
  const AUTH_BASE = "https://ep-noisy-king-bbgaaffj.neonauth.c-15.us-east-1.aws.neon.tech/neondb/auth";
  const RESOURCE = `${ORIGIN}/api/v1/sync`; // the access token's audience
  const SCOPE = "openid email offline_access";
  const AUTH_KEY = "auth";
  const STATUS_KEY = D.AUTH_STATUS_KEY; // core/store.js
  const REFRESH_EARLY_MS = 60000; // refresh when the access token has under a minute left
  const ACCESS_TTL_S = 3600; // if the reply omits expires_in
  const TOKEN_RE = /^[\x21-\x7e]{1,4096}$/;
  const EMAIL_RE = /^[^\s@\p{C}]{1,200}@[^\s@\p{C}]{1,200}$/u;
  const UNREGISTERED = "Lorestep for Chrome isn't registered with Lorestep yet. Sign-in will work once it is.";

  D.AUTH_KEY = AUTH_KEY;

  /** One of the provider's OAuth endpoints ("authorize", "token", "userinfo"). */
  D.authEndpoint = (name) => `${AUTH_BASE}/oauth2/${name}`;

  const URL_SAFE = { "+": "-", "/": "_", "=": "" };
  const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) => URL_SAFE[c]);
  const random = (n) => b64url(crypto.getRandomValues(new Uint8Array(n)));

  /** PKCE S256 (RFC 7636 4.2): base64url of the verifier's SHA-256. */
  D.pkceChallenge = async (verifier) =>
    b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));

  /** The authorize URL launchWebAuthFlow opens. */
  D.authorizeUrl = ({ clientId, redirectUri, state, challenge }) => {
    const q = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: SCOPE,
      resource: RESOURCE,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    return `${D.authEndpoint("authorize")}?${q}`;
  };

  const token = (v) => typeof v === "string" && TOKEN_RE.test(v);

  /** What the provider sent back to the redirect URI: { code } or { error: "denied" | "error" }.
      Anything not on our redirect URI, or with another state, is refused before the error is read. */
  D.readRedirect = (url, redirectUri, state) => {
    if (typeof url !== "string" || !url.startsWith(redirectUri)) return { error: "error" };
    const q = new URL(url).searchParams;
    if (q.get("state") !== state) return { error: "error" };
    if (q.has("error")) return { error: q.get("error") === "access_denied" ? "denied" : "error" };
    const code = q.get("code");
    return token(code) ? { code } : { error: "error" };
  };

  /** A token-endpoint reply as the stored shape, or null if a field is off. A refresh reply may
      omit refresh_token (RFC 6749 6); then the old one stays. */
  D.readTokens = (body, at, prevRefresh) => {
    const refresh = body?.refresh_token ?? prevRefresh;
    if (!token(body?.access_token) || !token(refresh)) return null;
    if (typeof body.token_type !== "string" || body.token_type.toLowerCase() !== "bearer") return null;
    const ttl = Number.isFinite(body.expires_in) && body.expires_in > 0 ? body.expires_in : ACCESS_TTL_S;
    return { accessToken: body.access_token, refreshToken: refresh, expiresAt: at + ttl * 1000 };
  };

  /** A userinfo email fit for "Signed in as" (display only, nothing is decided on it), else "". */
  const cleanEmail = (v) => (typeof v === "string" && EMAIL_RE.test(v) ? v : "");

  const readJson = (res) => res.json().catch(() => null);

  /** A chrome.storage.local-shaped get/set/remove over one IndexedDB object store. `idb` is
      globalThis.indexedDB in the worker; tests pass an in-memory stand-in. */
  D.idbVault = (idb) => {
    let opening = null;
    const open = () => {
      if (opening) return opening;
      opening = new Promise((ok, no) => {
        const r = idb.open("lorestep-auth", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("kv");
        r.onsuccess = () => ok(r.result);
        r.onerror = () => no(r.error);
      });
      opening.catch(() => {
        opening = null; // a failed open is tried again on the next call
      });
      return opening;
    };
    const tx = async (mode, fn) => {
      const db = await open();
      return new Promise((ok, no) => {
        const t = db.transaction("kv", mode);
        const req = fn(t.objectStore("kv"));
        t.oncomplete = () => ok(req?.result);
        t.onerror = () => no(t.error);
        t.onabort = () => no(t.error);
      });
    };
    return {
      async get(k) {
        const v = await tx("readonly", (s) => s.get(k));
        return v === undefined ? {} : { [k]: v };
      },
      set(o) {
        return tx("readwrite", (s) => {
          for (const [k, v] of Object.entries(o)) s.put(v, k);
        });
      },
      remove(keys) {
        return tx("readwrite", (s) => {
          for (const k of keys) s.delete(k);
        });
      },
    };
  };

  /** deps: fetch, storage (chrome.storage.local: the status only), vault (D.idbVault: the tokens),
      launchFlow(url) -> redirect URL (resolves with what chrome.identity.launchWebAuthFlow returns),
      redirectUri; tests add clientId, now. */
  D.makeAuth = (deps) => {
    const { fetch, storage, vault, launchFlow, redirectUri } = deps;
    const clientId = deps.clientId ?? CLIENT_ID;
    const now = deps.now || Date.now;
    let flow = null; // the sign-in in progress, at most one
    let run = 0; // bumped by signOut: a sign-in or refresh still running writes nothing after it
    let refreshing = null; // the refresh in flight, at most one

    /** One-time move: earlier versions kept the tokens in chrome.storage.local "auth". They go to
        the vault and the key is deleted even if the vault write fails (then the user signs in
        again). Every token read waits for this. */
    const migrate = async () => {
      const old = (await storage.get(AUTH_KEY))[AUTH_KEY];
      if (old === undefined) return;
      try {
        await vault.set({ [AUTH_KEY]: old });
      } finally {
        await storage.remove([AUTH_KEY]);
      }
    };
    // The error's name only: its message could quote the value being written.
    const migrated = migrate().catch((err) => console.warn("Lorestep for Chrome: token move failed", err?.name));
    const stored = async () => {
      await migrated;
      return (await vault.get(AUTH_KEY))[AUTH_KEY];
    };

    const setStatus = (status) => storage.set({ [STATUS_KEY]: status });

    /** A form POST to the token endpoint. */
    const tokenRequest = (fields) =>
      fetch(D.authEndpoint("token"), {
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: String(new URLSearchParams({ ...fields, client_id: clientId, resource: RESOURCE })),
      });

    const send = (path, body, accessToken) => {
      const headers = { authorization: `Bearer ${accessToken}` };
      if (body) headers["content-type"] = "application/json";
      return fetch(ORIGIN + path, {
        method: body ? "POST" : "GET",
        credentials: "omit",
        cache: "no-store",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    };

    /** "Signed in as": Neon's id_token carries no email, so userinfo is asked once after sign-in.
        Display only; any failure is "" and the sign-in stands. */
    const userinfoEmail = async (accessToken) => {
      try {
        const res = await fetch(D.authEndpoint("userinfo"), {
          credentials: "omit",
          cache: "no-store",
          headers: { authorization: `Bearer ${accessToken}` },
        });
        return res.ok ? cleanEmail((await readJson(res))?.email) : "";
      } catch {
        return "";
      }
    };

    const end = async (message) => {
      await vault.remove([AUTH_KEY]);
      await setStatus({ state: "signed-out", message });
    };

    /** The stored tokens, or null. A shape this version doesn't know (the old device-flow token)
        is deleted. No network. */
    const read = async () => {
      const a = await stored();
      if (token(a?.accessToken) && token(a.refreshToken) && Number.isFinite(a.expiresAt)) return a;
      if (a !== undefined) await vault.remove([AUTH_KEY]);
      return null;
    };

    /** Trades the refresh token for a new pair. The new pair is stored before anyone uses it
        (rotation: the old refresh token is spent). A refused grant signs out; a network error or a
        5xx throws and keeps the tokens, so sync backs off and tries again.
        Only ever runs as the one shared `refreshing` promise. Neon has no reuse window: presenting
        a refresh token that was already rotated revokes the whole grant. So the stored pair is
        re-read here, and if another refresh already replaced `spent`, the new pair is returned
        without a request.
        ponytail: a worker killed between the provider rotating and the set() below loses the new
        pair; the next refresh then gets invalid_grant and the user signs in again. */
    const refresh = async (spent) => {
      const mine = run;
      const a = await read();
      if (!a || a.refreshToken !== spent) return a;
      const res = await tokenRequest({ grant_type: "refresh_token", refresh_token: a.refreshToken });
      const body = await readJson(res);
      if (mine !== run) return null;
      if (res.status === 400 || res.status === 401) {
        await end("Your Lorestep sign-in ended. Sign in again.");
        return null;
      }
      const t = res.ok ? D.readTokens(body, now(), a.refreshToken) : null;
      if (!t) throw new Error(`Lorestep's sign-in service answered ${res.status}`);
      t.email = a.email || "";
      await vault.set({ [AUTH_KEY]: t });
      return t;
    };

    /** Tokens fit to send: refreshed first when under a minute is left, or when `stale` is the
        access token a 401 just answered. Concurrent callers share one refresh (single flight). */
    const fresh = async (stale) => {
      if (refreshing) return refreshing;
      const a = await read();
      if (!a) return null;
      if (a.accessToken !== stale && now() < a.expiresAt - REFRESH_EARLY_MS) return a;
      refreshing ??= refresh(a.refreshToken).finally(() => {
        refreshing = null;
      });
      return refreshing;
    };

    /** A request to Lorestep as the signed-in user. Signed out: null, and no request at all.
        A 401 refreshes once and retries; a second 401 means Lorestep ended the sign-in. */
    const call = async (path, body) => {
      const a = await fresh();
      if (!a) return null;
      const res = await send(path, body, a.accessToken);
      if (res.status !== 401) return res;
      const b = await fresh(a.accessToken);
      if (!b) return res;
      const again = await send(path, body, b.accessToken);
      if (again.status === 401) await end("Lorestep signed this browser out. Sign in again.");
      return again;
    };

    const login = async (mine) => {
      const live = () => mine === run;
      try {
        const state = random(32);
        const verifier = random(48); // 64 characters
        const challenge = await D.pkceChallenge(verifier);
        await setStatus({ state: "waiting" });
        let back;
        try {
          back = await launchFlow(D.authorizeUrl({ clientId, redirectUri, state, challenge }));
        } catch {
          // The user closed the window, or it couldn't load.
          if (live()) await setStatus({ state: "signed-out", message: "Sign-in didn't finish. Nothing changed." });
          return;
        }
        if (!live()) return;
        const r = D.readRedirect(back, redirectUri, state);
        if (r.error) {
          await setStatus({ state: r.error });
          return;
        }
        const res = await tokenRequest({
          grant_type: "authorization_code",
          code: r.code,
          code_verifier: verifier,
          redirect_uri: redirectUri,
        });
        const body = await readJson(res);
        const t = res.ok ? D.readTokens(body, now()) : null;
        if (!t) throw new Error(`Lorestep answered ${res.status}`);
        if (!live()) return;
        t.email = await userinfoEmail(t.accessToken);
        if (!live()) return;
        await vault.set({ [AUTH_KEY]: t });
        await setStatus({ state: "signed-in", email: t.email });
      } catch (err) {
        const message = `Couldn't sign in to Lorestep (${err?.message || err}). Try again.`;
        if (live()) await setStatus({ state: "error", message });
      }
    };

    /** Opens the Lorestep sign-in window, or returns the sign-in already running. Never rejects. */
    const signIn = () => {
      if (!clientId) return setStatus({ state: "error", message: UNREGISTERED });
      if (flow) return flow;
      const p = login(++run).finally(() => {
        if (flow === p) flow = null;
      });
      flow = p;
      return p;
    };

    /** Deletes the tokens here. No request: Neon Auth documents no revocation endpoint, so the
        grant ends when its refresh token expires (lorestep PLAN 12.2). background.js then removes
        every sync:* key. signedOut: false when there were no tokens (a cancelled sign-in). */
    const signOut = async () => {
      run++;
      flow = null;
      const had = (await stored()) !== undefined;
      await vault.remove([AUTH_KEY]);
      await setStatus({ state: "signed-out" });
      return { ok: true, signedOut: had };
    };

    /** What the library shows. Repairs a status the worker can no longer back up. No network. */
    const status = async () => {
      let s = (await storage.get(STATUS_KEY))[STATUS_KEY] || { state: "signed-out" };
      if (s.state === "waiting" && !flow) {
        s = { state: "error", message: "The sign-in was interrupted. Try again." };
        await setStatus(s);
      } else if (s.state === "signed-in" && !(await read())) {
        s = { state: "signed-out", message: "Your Lorestep sign-in ran out. Sign in again." };
        await setStatus(s);
      }
      return s;
    };

    /** True while tokens are stored. No network. */
    const signedIn = async () => Boolean(await read());

    return { signIn, signOut, status, call, signedIn };
  };
})();
