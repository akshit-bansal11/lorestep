import { toLibraryStatus } from "@/mappers/log/status-mapper";
import type { ServerGameEntry } from "@/types/canon/sync";
import type { UserEntries } from "@/types/canon/user";
import { sanitiseEntries } from "@/utils/canon/entries-store";

/**
 * Account game rows -> the games table's marks. A status the table has no id for yet (`planned`,
 * `on_hold`, set by the library or the extension) is left out of the cache, never rewritten.
 */
export function toUserEntries(items: readonly ServerGameEntry[]): UserEntries {
  const raw: Record<string, unknown> = {};
  for (const { gameId, device, storefront, ...state } of items) {
    if (gameId !== null) raw[gameId] = { status: toLibraryStatus(state), device, storefront };
  }
  return sanitiseEntries(raw);
}
