import { and, asc, eq, inArray, isNull, or, type SQL, sql } from "drizzle-orm";

import {
  ENRICH_BATCH_SIZE,
  ENRICH_CONCURRENCY,
  ENRICH_KINDS,
  ENRICH_TIME_BUDGET_MS,
} from "@/constants/metadata/enrich";
import { ANIME_MOVABLE } from "@/lib/db/anime-movable";
import { ANIME_TWIN } from "@/lib/db/anime-twin";
import { db } from "@/lib/db/client";
import { entries } from "@/lib/db/schema";
import { LookupError } from "@/lib/metadata/lookup-error";
import { matchMal } from "@/lib/metadata/mal-match";
import { matchTmdb, tmdbConfigured } from "@/lib/metadata/tmdb-match";
import type { EnrichCandidate, EnrichResult } from "@/types/metadata/enrich";

/** Live movie, series and anime entries missing a year or poster that were never looked up. */
async function readCandidates(userId: string | undefined): Promise<EnrichCandidate[]> {
  const where: (SQL | undefined)[] = [
    isNull(entries.deletedAt),
    isNull(entries.enrichedAt),
    inArray(entries.kind, [...ENRICH_KINDS]),
    or(isNull(entries.year), isNull(entries.imageUrl)),
  ];
  if (userId !== undefined) where.push(eq(entries.userId, userId));
  // ponytail: random order, so entries left unmarked (no TMDB key, provider down) cannot hold
  // the head of the queue; it sorts every candidate, fine at a few thousand rows.
  return db()
    .select({
      id: entries.id,
      userId: entries.userId,
      kind: entries.kind,
      title: entries.title,
      titleNorm: entries.titleNorm,
      year: entries.year,
      movable: ANIME_MOVABLE,
      twin: ANIME_TWIN,
    })
    .from(entries)
    .where(and(...where))
    .orderBy(sql`random()`, asc(entries.id))
    .limit(ENRICH_BATCH_SIZE);
}

/**
 * Looks one entry up and writes what was found, filling only empty fields. Movie or series moves
 * to anime when TMDB calls it Animation from JP, KR or CN, or MyAnimeList lists the exact title and
 * TMDB (configured) has no match or calls it Animation. Only an entry the extension created and
 * the user never touched, with no anime twin; the statement re-checks both. `ext_source` and
 * `ext_id` are never touched. Without a TMDB key `enriched_at` stays empty, so the entry is looked
 * up again once the key exists.
 */
async function enrichOne(row: EnrichCandidate): Promise<{ filled: boolean; upgraded: boolean }> {
  const kind = row.kind === "movie" ? "movie" : "tv";
  const tmdb = await matchTmdb(row.title, row.titleNorm, row.year, kind);
  const withTmdb = tmdbConfigured();
  const canUpgrade = row.kind !== "anime" && row.movable && !row.twin;
  // MAL is the poster and year fallback when TMDB has no match, and the second anime signal. It
  // counts only when TMDB was asked and found nothing or calls it Animation: a live-action show
  // sharing an anime's title (One Piece, 2023) stays put.
  const malCounts = withTmdb && (tmdb === null || tmdb.animation);
  const askMal = tmdb === null || (canUpgrade && !tmdb.anime && malCounts);
  const mal = askMal ? await matchMal(row.title, row.titleNorm, row.year) : null;

  const year = tmdb?.year ?? mal?.year ?? null;
  const image = tmdb?.image ?? mal?.image ?? null;
  const upgraded = canUpgrade && (tmdb?.anime === true || (mal !== null && malCounts));
  const filled = year !== null || image !== null;

  const now = new Date();
  if (!withTmdb && !filled) return { filled, upgraded };
  await db()
    .update(entries)
    .set({
      ...(withTmdb ? { enrichedAt: now } : {}),
      ...(filled || upgraded ? { updatedAt: now } : {}),
      ...(year === null ? {} : { year: sql`COALESCE("entries"."year", ${year}::smallint)` }),
      ...(image === null ? {} : { imageUrl: sql`COALESCE("entries"."image_url", ${image})` }),
      ...(upgraded
        ? {
            kind: sql`CASE WHEN ${ANIME_MOVABLE} AND NOT ${ANIME_TWIN} THEN 'anime'
              ELSE "entries"."kind" END`,
          }
        : {}),
    })
    .where(and(eq(entries.id, row.id), eq(entries.userId, row.userId), isNull(entries.deletedAt)));
  return { filled, upgraded };
}

/** Marks an entry whose lookup fails for good (a 4xx), so it stops coming back. */
async function markTried(row: EnrichCandidate) {
  await db()
    .update(entries)
    .set({ enrichedAt: new Date() })
    .where(and(eq(entries.id, row.id), eq(entries.userId, row.userId)));
}

/**
 * Fills the year and poster of up to `ENRICH_BATCH_SIZE` entries (one user's, or anyone's for the
 * daily sweep) from TMDB and MyAnimeList, two lookups at a time, starting no entry after
 * `ENRICH_TIME_BUDGET_MS`. A looked-up entry is marked `enriched_at`, hit or miss, and so is one
 * a provider refuses with a 4xx; a 429, 5xx or network error ends the run and leaves the rest for
 * the next one. A silent no-op when neither provider has a key.
 */
export async function enrichEntries(userId?: string): Promise<EnrichResult> {
  const result: EnrichResult = { scanned: 0, filled: 0, upgraded: 0, failed: 0 };
  if (!tmdbConfigured() && !process.env.MAL_CLIENT_ID) return result;

  const started = Date.now();
  const queue = await readCandidates(userId);
  let stop = false;
  const worker = async () => {
    while (!stop && Date.now() - started < ENRICH_TIME_BUDGET_MS) {
      const row = queue.shift();
      if (row === undefined) return;
      result.scanned += 1;
      try {
        const done = await enrichOne(row);
        if (done.filled) result.filled += 1;
        if (done.upgraded) result.upgraded += 1;
      } catch (error) {
        result.failed += 1;
        if (error instanceof LookupError && error.permanent) await markTried(row);
        else stop = true;
      }
    }
  };
  await Promise.all(Array.from({ length: ENRICH_CONCURRENCY }, worker));
  if (result.failed > 0) console.warn(`Metadata enrichment: ${result.failed} lookups failed`);
  return result;
}
