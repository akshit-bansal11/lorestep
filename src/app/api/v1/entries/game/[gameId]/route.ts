import type { NextRequest } from "next/server";

import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { ENTRY_LIMITS } from "@/constants/log/entries";
import { guardMutation } from "@/lib/http/guard-mutation";
import { HttpError } from "@/lib/http/http-error";
import { readJson } from "@/lib/http/read-json";
import { fail, noContent, ok } from "@/lib/http/respond";
import { gameEntrySchema, gameIdSchema } from "@/schemas/log/entry";
import { setGameEntry } from "@/services/log/entries-service";
import type { GameEntryRouteContext } from "@/types/log/entry";

/**
 * The games table's status, device and storefront for one catalog game, replaced whole. 200 with
 * the entry, or 204 when all three are cleared. 404 for a game not in the catalog.
 */
export async function PUT(request: NextRequest, { params }: GameEntryRouteContext) {
  try {
    const userId = await guardMutation(request, "entries", RATE_LIMITS.entriesWrite);
    const gameId = gameIdSchema.safeParse((await params).gameId);
    if (!gameId.success) throw new HttpError(404, "not_found", "That game is not in the catalog.");
    const body = gameEntrySchema.safeParse(await readJson(request, ENTRY_LIMITS.bodyBytes));
    if (!body.success)
      throw new HttpError(400, "invalid_body", "Send a status, device or storefront.");
    const entry = await setGameEntry(userId, gameId.data, body.data);
    return entry === null ? noContent() : ok(entry);
  } catch (error) {
    return fail(error);
  }
}
