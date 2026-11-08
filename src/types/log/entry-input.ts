import type { z } from "zod";

import type { entryCreateSchema, entryPatchSchema } from "@/schemas/log/entry";

/** Request bodies as the browser builds them (dates are ISO strings until the server parses). */
export type EntryCreateInput = z.input<typeof entryCreateSchema>;
export type EntryPatchInput = z.input<typeof entryPatchSchema>;
