import type { z } from "zod";

import type { IMPORT_DECISIONS } from "@/constants/canon/sync";
import type { gameEntriesPageSchema, syncRecordSchema } from "@/schemas/canon/sync";

export type ImportDecision = (typeof IMPORT_DECISIONS)[number];

/**
 * `decisions` per userId; `owner` is the user whose server marks fill the entries cache (null =
 * the browser's own marks are in it); `anon` holds the browser's marks meanwhile; `pending` holds,
 * per userId, the games whose last edit the server has not confirmed.
 */
export type SyncRecord = z.infer<typeof syncRecordSchema>;

export type ServerGameEntry = z.infer<typeof gameEntriesPageSchema>["data"]["items"][number];

/** What the banner shows after a session starts. */
export type SessionStart = "prompt" | "synced";
