/* Lorestep for Chrome auth: sign in to Lorestep with OAuth 2.1 authorization code + PKCE, Neon Auth as the
   provider (lorestep docs/EXTENSION.md, PLAN.md section 12, N-12). Only background.js calls makeAuth.
   Loads after core/store.js, which names the storage keys.
   Tokens live in chrome.storage.local "auth" and leave the worker only as an Authorization header to
   Lorestep or a form body to the token endpoint; they are never logged and never put in a message.
   The library reads "auth:status" (state, email, message), never a token.
   While signed out nothing here touches the network, except the sign-in the user starts. */
(() => {
  "use strict";
  globalThis.Lorestep ??= {};
  const D = globalThis.Lorestep;

  const ORIGIN = "https://lorestep.akshitbansal.dev";
  // The extension's public OAuth client, registered with Neon Auth on 2026-11-09 (lorestep PLAN 12.4).
  // Public client: no secret; PKCE protects the code exchange.
  const CLIENT_ID = "QHsrHeWAKSsEaVpDisiAwJBAdMXtMNvX";
  // Authorize and token endpoints share this base. Default: Lorestep's proxy (option B). If the
  // lorestep N4 spike proves option A, set it to the Neon Auth base
  // https://ep-noisy-king-bbgaaffj.neonauth.c-15.us-east-1.aws.neon.tech/neondb/auth (its origin is
  // already in host_permissions).
  const AUTH_BASE = `${ORIGIN}/api/auth`;
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

  /** One of the provider's OAuth endpoints ("authorize", "token"). */
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

  const cleanEmail = (v) => (typeof v === "string" && EMAIL_RE.test(v) ? v : "");

  /** The email claim of an id_token, for "Signed in as" only: the signature is not checked, and
      nothing is decided on it. "" when absent or unusable. */
  D.idTokenEmail = (idToken) => {
    try {
      const part = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = new TextDecoder().decode(Uint8Array.from(atob(part), (c) => c.charCodeAt(0)));
      return cleanEmail(JSON.parse(json).email);
    } catch {
      return "";
    }
  };

  const readJson = (res) => res.json().catch(() => null);

  /** deps: fetch, storage (chrome.storage.local-like), launchFlow(url) -> redirect URL (resolves
      with what chrome.identity.launchWebAuthFlow returns), redirectUri; tests add clientId, now. */
  D.makeAuth = (deps) => {
    const { fetch, storage, launchFlow, redirectUri } = deps;
    const clientId = deps.clientId ?? CLIENT_ID;
    const now = deps.now || Date.now;
    let flow = null; // the sign-in in progress, at most one
    let run = 0; // bumped by signOut: a sign-in or refresh still running writes nothing after it
    let refreshing = null; // the refresh in flight, at most one

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

    const end = async (message) => {
      await storage.remove([AUTH_KEY]);
      await setStatus({ state: "signed-out", message });
    };

    /** The stored tokens, or null. A shape this version doesn't know (the old device-flow token)
        is deleted. No network. */
    const read = async () => {
      const a = (await storage.get(AUTH_KEY))[AUTH_KEY];
      if (token(a?.accessToken) && token(a.refreshToken) && Number.isFinite(a.expiresAt)) return a;
      if (a !== undefined) await storage.remove([AUTH_KEY]);
      return null;
    };

    /** Trades the refresh token for a new pair. The new pair is stored before anyone uses it
        (rotation: the old refresh token is spent). A refused grant signs out; a network error or a
        5xx throws and keeps the tokens, so sync backs off and tries again.
        ponytail: a worker killed between the provider rotating and the set() below loses the new
        pair; the next refresh then gets invalid_grant and the user signs in again. */
    const refresh = async (a) => {
      const mine = run;
      const res = await tokenRequest({ grant_type: "refresh_token", refresh_token: a.refreshToken });
      const body = await readJson(res);
      if (mine !== run) return null;
      if (res.status === 400 || res.status === 401) {
        await end("Your Lorestep sign-in ended. Sign in again.");
        return null;
      }
      const t = res.ok ? D.readTokens(body, now(), a.refreshToken) : null;
      if (!t) throw new Error(`Lorestep's sign-in service answered ${res.status}`);
      t.email = D.idTokenEmail(body.id_token) || a.email || "";
      await storage.set({ [AUTH_KEY]: t });
      return t;
    };

    /** Tokens fit to send: refreshed first when under a minute is left, or when `stale` is the
        access token a 401 just answered. Concurrent callers share one refresh. */
    const fresh = async (stale) => {
      const a = await read();
      if (!a) return null;
      if (a.accessToken !== stale && now() < a.expiresAt - REFRESH_EARLY_MS) return a;
      refreshing ??= refresh(a).finally(() => {
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
        t.email = D.idTokenEmail(body.id_token);
        await storage.set({ [AUTH_KEY]: t });
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
      const had = (await storage.get(AUTH_KEY))[AUTH_KEY] !== undefined;
      await storage.remove([AUTH_KEY]);
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
