import { z } from "zod";

import {
  CURSOR_AT_PATTERN,
  CURSOR_MAX_OFFSET_HOURS,
  CURSOR_SEPARATOR,
} from "@/constants/log/entries";
import type { EntryCursor } from "@/types/log/entry";

/**
 * True when `at` has the shape Postgres prints AND names a real instant: its date and time are
 * parsed as UTC and printed back, so a month 99 or a 31 February fails the round trip. Year 0000
 * and offsets past ±15:59 are refused too, since Postgres would reject them in the cast.
 */
export function isCursorInstant(at: string): boolean {
  const parts = CURSOR_AT_PATTERN.exec(at)?.groups;
  if (parts === undefined || parts.y === "0000") return false;
  if (Math.abs(Number(parts.oh ?? 0)) > CURSOR_MAX_OFFSET_HOURS) return false;
  if (Number(parts.om ?? 0) >= 60) return false;

  const wall = `${parts.y}-${parts.mo}-${parts.d}T${parts.h}:${parts.mi}:${parts.s}`;
  const parsed = new Date(`${wall}Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(wall);
}

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
  if (split < 0 || !isCursorInstant(at) || !z.uuid().safeParse(id).success) return null;
  return { at, id };
}
