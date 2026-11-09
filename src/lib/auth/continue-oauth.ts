import {
  OAUTH_COPY,
  OAUTH_QUERY_MAX,
  REPEATABLE_OAUTH_KEY,
  SCOPE_LABELS,
} from "@/constants/auth/oauth";
import type { OAuthRequest, SearchRecord } from "@/types/auth/oauth";

/**
 * The signed authorization request Neon Auth put on a login or consent page URL, returned exactly
 * as received (Neon checks its signature and expiry), or null when it cannot be one: empty,
 * oversized, or missing `sig` or `client_id`. The value is only ever sent back to Neon as the
 * `oauth_query` body field or appended to our own `/oauth/login`; no URL to another origin is
 * ever built from it, so it cannot become an open redirect.
 */
export function readOAuthQuery(search: string): string | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  if (raw.length === 0 || raw.length > OAUTH_QUERY_MAX) return null;
  const params = new URLSearchParams(raw);
  // Fail closed on repeated keys (only Neon's own `ba_param` may repeat): otherwise the consent
  // page could display a different client, scope or redirect than the one Neon verified.
  const keys = [...params.keys()].filter((key) => key !== REPEATABLE_OAUTH_KEY);
  if (new Set(keys).size !== keys.length) return null;
  return params.has("sig") && (params.get("client_id") ?? "") !== "" ? raw : null;
}

/** A page's `searchParams` back as a query string, repeated keys kept (Neon signs `ba_param`s). */
export function searchFromRecord(record: SearchRecord): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    for (const one of [value ?? []].flat()) params.append(key, one);
  }
  return params.toString();
}

/** `POST /oauth2/continue` body for a login page that already has a session. */
export const continueBody = (oauthQuery: string) => ({ selected: true, oauth_query: oauthQuery });

/** `POST /oauth2/consent` body. `accept: false` makes Neon return `error=access_denied`. */
export const consentBody = (accept: boolean, oauthQuery: string) => ({
  accept,
  oauth_query: oauthQuery,
});

/** What the consent page shows, read from a query `readOAuthQuery` accepted. */
export function describeOAuthQuery(oauthQuery: string): OAuthRequest {
  const params = new URLSearchParams(oauthQuery);
  let redirectHost: string | null;
  try {
    redirectHost = new URL(params.get("redirect_uri") ?? "").host;
  } catch {
    redirectHost = null;
  }
  return {
    clientId: params.get("client_id") ?? "",
    scopes: (params.get("scope") ?? "").split(" ").filter((scope) => scope !== ""),
    resource: params.get("resource"),
    redirectHost,
  };
}

/**
 * The consent page's "It will be able to" lines: each scope in plain words (unknown ones raw),
 * then the resource, named when it is this app's sync API.
 */
export function grantLines(request: OAuthRequest, syncResource: string): string[] {
  const scopes = request.scopes.map((scope) => SCOPE_LABELS[scope] ?? scope);
  const { resource } = request;
  if (resource === null) return scopes;
  return [...scopes, resource === syncResource ? OAUTH_COPY.syncResource : resource];
}
