import type { EnrichHit } from "@/types/metadata/enrich";

/**
 * The one hit among exact-title results, narrowed to the entry's year when it has one. Zero or
 * several = null: an ambiguous title is skipped, never guessed.
 */
export function pickUniqueHit(hits: readonly EnrichHit[], year: number | null): EnrichHit | null {
  const fits = year === null ? hits : hits.filter((hit) => hit.year === year);
  return fits.length === 1 ? (fits[0] ?? null) : null;
}
