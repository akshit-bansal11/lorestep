import { safeFetchJson } from "@/lib/http/safe-fetch";

const REFRESH_MARGIN_MS = 60_000;

/** Per-instance token cache: a cold instance just fetches one more token. */
const cache: { token: string | null; expiresAt: number } = { token: null, expiresAt: 0 };

export interface IgdbAccess {
  clientId: string;
  token: string;
}

/**
 * IGDB sits behind Twitch OAuth (client credentials). Returns null when `IGDB_CLIENT_ID` or
 * `IGDB_CLIENT_SECRET` is unset or Twitch refuses; the secret goes in the POST body, not the URL.
 */
export async function getIgdbAccess(): Promise<IgdbAccess | null> {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cache.token !== null && cache.expiresAt > Date.now() + REFRESH_MARGIN_MS) {
    return { clientId, token: cache.token };
  }

  const res = await safeFetchJson<{ access_token?: unknown; expires_in?: unknown }>(
    "https://id.twitch.tv/oauth2/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    },
  );
  if (!res.ok) return null;
  const { access_token: token, expires_in: expiresIn } = res.data;
  if (typeof token !== "string" || typeof expiresIn !== "number") return null;

  cache.token = token;
  cache.expiresAt = Date.now() + expiresIn * 1000;
  return { clientId, token };
}

/** Headers for an IGDB v4 query (Apicalypse text body). */
export const igdbHeaders = ({ clientId, token }: IgdbAccess): HeadersInit => ({
  "Client-ID": clientId,
  Authorization: `Bearer ${token}`,
  "Content-Type": "text/plain",
});
