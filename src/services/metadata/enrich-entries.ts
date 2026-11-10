import { and, asc, eq, inArray, isNull, or, type SQL, sql } from "drizzle-orm";

import { ENRICH_BATCH_SIZE, ENRICH_CONCURRENCY, ENRICH_KINDS } from "@/constants/metadata/enrich";
import { ANIME_TWIN } from "@/lib/db/anime-twin";
import { db } from "@/lib/db/client";
import { entries } from "@/lib/db/schema";
import { matchMal } from "@/lib/metadata/mal-match";
import { matchTmdb, tmdbConfigured } from "@/lib/metadata/tmdb-match";
import { KEEP } from "@/services/sync/push";
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
  // ponytail: no index on enriched_at; add a partial one if the sweep shows up in slow queries.
  return db()
    .select({
      id: entries.id,
      userId: entries.userId,
      kind: entries.kind,
      title: entries.title,
      titleNorm: entries.titleNorm,
      keep: KEEP,
      twin: ANIME_TWIN,
    })
    .from(entries)
    .where(and(...where))
    .orderBy(asc(entries.createdAt))
    .limit(ENRICH_BATCH_SIZE);
}

/**
 * Looks one entry up and writes what was found, filling only empty fields. Movie or series moves
 * to anime when TMDB calls it Animation from JP, KR or CN, or MyAnimeList lists the exact title and
 * TMDB has no match or calls it Animation. Only while the entry has no user edits and no anime
 * twin; the statement re-checks both, so a rating or a twin added meanwhile still wins.
 * `ext_source` and `ext_id` are never touched.
 */
async function enrichOne(row: EnrichCandidate): Promise<{ filled: boolean; upgraded: boolean }> {
  const tmdb = await matchTmdb(row.title, row.titleNorm, row.kind === "movie" ? "movie" : "tv");
  const canUpgrade = row.kind !== "anime" && !row.keep && !row.twin;
  // MAL is the poster and year fallback when TMDB has no match, and the second anime signal.
  // A MAL match counts only when TMDB has no match or calls it Animation: a live-action show
  // that shares an anime's title (One Piece, 2023) stays put.
  const malCounts = tmdb === null || tmdb.animation;
  const askMal = tmdb === null || (canUpgrade && !tmdb.anime && malCounts);
  const mal = askMal ? await matchMal(row.title, row.titleNorm) : null;

  const year = tmdb?.year ?? mal?.year ?? null;
  const image = tmdb?.image ?? mal?.image ?? null;
  const upgraded = canUpgrade && (tmdb?.anime === true || (mal !== null && malCounts));
  const filled = year !== null || image !== null;

  const now = new Date();
  await db()
    .update(entries)
    .set({
      enrichedAt: now,
      ...(filled || upgraded ? { updatedAt: now } : {}),
      ...(year === null ? {} : { year: sql`COALESCE("entries"."year", ${year}::smallint)` }),
      ...(image === null ? {} : { imageUrl: sql`COALESCE("entries"."image_url", ${image})` }),
      ...(upgraded
        ? { kind: sql`CASE WHEN ${KEEP} OR ${ANIME_TWIN} THEN "entries"."kind" ELSE 'anime' END` }
        : {}),
    })
    .where(and(eq(entries.id, row.id), eq(entries.userId, row.userId), isNull(entries.deletedAt)));
  return { filled, upgraded };
}

/**
 * Fills the year and poster of up to `ENRICH_BATCH_SIZE` entries (one user's, or anyone's for the
 * daily sweep) from TMDB and MyAnimeList, two lookups at a time. Each looked-up entry is marked
 * `enriched_at`, hit or miss, so a miss is not retried; an entry whose provider failed is left
 * unmarked for the next run. A silent no-op when neither provider has a key.
 */
export async function enrichEntries(userId?: string): Promise<EnrichResult> {
  const result: EnrichResult = { scanned: 0, filled: 0, upgraded: 0, failed: 0 };
  if (!tmdbConfigured() && !process.env.MAL_CLIENT_ID) return result;

  const queue = await readCandidates(userId);
  result.scanned = queue.length;
  const worker = async () => {
    for (let row = queue.shift(); row !== undefined; row = queue.shift()) {
      try {
        const done = await enrichOne(row);
        if (done.filled) result.filled += 1;
        if (done.upgraded) result.upgraded += 1;
      } catch {
        result.failed += 1;
      }
    }
  };
  await Promise.all(Array.from({ length: ENRICH_CONCURRENCY }, worker));
  if (result.failed > 0) console.warn(`Metadata enrichment: ${result.failed} lookups failed`);
  return result;
}
