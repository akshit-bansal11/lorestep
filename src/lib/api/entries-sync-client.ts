import { GAME_ENTRIES_URL, GAME_ENTRY_URL, IMPORT_URL } from "@/constants/canon/sync";
import { apiRequest, apiSend } from "@/lib/api/api-request";
import { gameEntriesPageSchema, importResponseSchema } from "@/schemas/canon/sync";
import type { ServerGameEntry } from "@/types/canon/sync";
import type { UserEntries } from "@/types/canon/user";
import type { GameEntryInput } from "@/types/log/entry";
import type { ImportResult } from "@/types/log/import";

const JSON_ACCEPT = { accept: "application/json" };

/** The HTTP status of replacing one game's marks, or 0 when the request never got an answer. */
export async function putGameEntry(gameId: string, mark: GameEntryInput): Promise<number> {
  const result = await apiSend(GAME_ENTRY_URL + encodeURIComponent(gameId), {
    method: "PUT",
    json: mark,
  });
  return result.ok ? 204 : result.failure.status;
}

/** `{inserted, skipped}`, or null when the import did not go through. */
export async function postLocalImport(entries: UserEntries): Promise<ImportResult | null> {
  const result = await apiRequest(IMPORT_URL, importResponseSchema, {
    method: "POST",
    json: { entries },
  });
  return result.ok ? result.data.data : null;
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
