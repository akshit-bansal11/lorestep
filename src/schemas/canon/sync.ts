import { z } from "zod";

import { IMPORT_DECISIONS } from "@/constants/canon/sync";
import { CANONICAL_STATUSES, SHELVES } from "@/constants/log/statuses";
import { gameEntrySchema } from "@/schemas/log/entry";
import { sanitiseEntries } from "@/utils/canon/entries-store";

/** The `IMPORT_STORAGE_KEY` record. Each field falls back on its own, so one bad field loses only itself. */
export const syncRecordSchema = z.object({
  decisions: z.record(z.string(), z.enum(IMPORT_DECISIONS)).catch({}),
  owner: z.string().nullable().catch(null),
  anon: z.unknown().transform(sanitiseEntries),
  pending: z.record(z.string(), z.record(z.string(), gameEntrySchema)).catch({}),
});

export const importResponseSchema = z.object({
  data: z.object({ inserted: z.number(), skipped: z.number() }),
});

/** The slice of a GET /api/v1/entries page the games table needs. */
export const gameEntriesPageSchema = z.object({
  data: z.object({
    items: z.array(
      z.object({
        gameId: z.string().nullable(),
        status: z.enum(CANONICAL_STATUSES).nullable(),
        shelf: z.enum(SHELVES).nullable(),
        device: z.string().nullable(),
        storefront: z.string().nullable(),
      }),
    ),
    nextCursor: z.string().nullable(),
  }),
});
