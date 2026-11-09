import type { z } from "zod";

import type { localImportSchema } from "@/schemas/log/import-local";
import type { CanonicalStatus, Shelf } from "@/types/log/status";

/** gameId -> mark, as POST /api/v1/import/local receives it. */
export type LocalMarks = z.infer<typeof localImportSchema>["entries"];

export interface ImportResult {
  inserted: number;
  skipped: number;
}

/** One row handed to `jsonb_to_recordset`, so its keys are the column names. */
export interface ImportRow {
  game_id: string;
  title: string;
  title_norm: string;
  status: CanonicalStatus | null;
  shelf: Shelf | null;
  device: string | null;
  storefront: string | null;
}

export interface CatalogGame {
  id: string;
  title: string;
}
