import { z } from "zod";

import { CURSOR_AT_PATTERN, CURSOR_SEPARATOR } from "@/constants/log/entries";
import type { EntryCursor } from "@/types/log/entry";

/** Opaque keyset cursor: base64url of `updated_at::text|id`. */
export function encodeCursor({ at, id }: EntryCursor): string {
  return Buffer.from(`${at}${CURSOR_SEPARATOR}${id}`).toString("base64url");
}

/** `null` for anything this server did not mint, so a forged cursor never reaches a SQL cast. */
export function decodeCursor(cursor: string): EntryCursor | null {
  const raw = Buffer.from(cursor, "base64url").toString();
  const split = raw.lastIndexOf(CURSOR_SEPARATOR);
  const at = raw.slice(0, split);
  const id = raw.slice(split + 1);
  if (split < 0 || !CURSOR_AT_PATTERN.test(at) || !z.uuid().safeParse(id).success) return null;
  return { at, id };
}
