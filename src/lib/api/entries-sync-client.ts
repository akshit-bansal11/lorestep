import {
  CSRF_URL,
  GAME_ENTRIES_URL,
  GAME_ENTRY_URL,
  IMPORT_URL,
} from "@/constants/canon/sync";
import { CSRF_HEADER } from "@/constants/http/http";
import {
  csrfResponseSchema,
  gameEntriesPageSchema,
  importResponseSchema,
} from "@/schemas/canon/sync";
import type { ServerGameEntry } from "@/types/canon/sync";
import type { UserEntries } from "@/types/canon/user";
import type { GameEntryInput } from "@/types/log/entry";
import type { ImportResult } from "@/types/log/import";

const JSON_ACCEPT = { accept: "application/json" };

let token: Promise<string | null> | null = null;

async function loadToken(): Promise<string | null> {
  const response = await fetch(CSRF_URL, { headers: JSON_ACCEPT, cache: "no-store" });
  if (!response.ok) return null;
  const parsed = csrfResponseSchema.safeParse(await response.json());
  return parsed.success ? parsed.data.data.token : null;
}

/**
 * A cookie-authenticated JSON mutation with the double-submit CSRF token (PLAN.md section 11 Q3).
 * `null` when offline or the token could not be had; the token is refetched after any failure.
 */
async function send(method: "POST" | "PUT", url: string, body: unknown): Promise<Response | null> {
  try {
    token ??= loadToken();
    const csrf = await token;
    if (csrf === null) {
      token = null;
      return null;
    }
    const response = await fetch(url, {
      method,
      headers: { ...JSON_ACCEPT, "content-type": "application/json", [CSRF_HEADER]: csrf },
      body: JSON.stringify(body),
    });
    if (response.status === 403) token = null;
    return response;
  } catch (error) {
    token = null;
    console.warn("Sync request failed", error);
    return null;
  }
}

/** The HTTP status of replacing one game's marks, or 0 when the request never got an answer. */
export async function putGameEntry(gameId: string, mark: GameEntryInput): Promise<number> {
  const response = await send("PUT", GAME_ENTRY_URL + encodeURIComponent(gameId), mark);
  return response?.status ?? 0;
}

/** `{inserted, skipped}`, or null when the import did not go through. */
export async function postLocalImport(entries: UserEntries): Promise<ImportResult | null> {
  const response = await send("POST", IMPORT_URL, { entries });
  if (response === null || !response.ok) return null;
  const parsed = importResponseSchema.safeParse(await response.json());
  return parsed.success ? parsed.data.data : null;
}

/** Every game row in the account, or null when any page failed (the cache is then left alone). */
export async function fetchGameEntries(): Promise<ServerGameEntry[] | null> {
  const items: ServerGameEntry[] = [];
  let cursor: string | null = null;
  try {
    do {
      const page = cursor === null ? "" : `&cursor=${encodeURIComponent(cursor)}`;
      const response = await fetch(GAME_ENTRIES_URL + page, {
        headers: JSON_ACCEPT,
        cache: "no-store",
      });
      if (!response.ok) return null;
      const parsed = gameEntriesPageSchema.safeParse(await response.json());
      if (!parsed.success) return null;
      items.push(...parsed.data.data.items);
      cursor = parsed.data.data.nextCursor;
    } while (cursor !== null);
    return items;
  } catch (error) {
    console.warn("Could not read the account's games", error);
    return null;
  }
}
