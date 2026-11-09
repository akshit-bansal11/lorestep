import { COMPATIBLE_KINDS, SYNC_KINDS } from "@/constants/sync/sync";
import type { SyncCandidate, SyncKind, SyncMatchInput, SyncPlatform } from "@/types/sync/sync";

/** The stored kinds a mark may land on (D-14). No kind = any streaming kind. */
export function compatibleKinds(kind: SyncKind | undefined): readonly SyncKind[] {
  return kind === undefined ? SYNC_KINDS : COMPATIBLE_KINDS[kind];
}

/** The kind of an entry created from a mark: its own, else `series` (`anime` on Crunchyroll). */
export function kindForNew(kind: SyncKind | undefined, platform: SyncPlatform): SyncKind {
  return kind ?? (platform === "crunchyroll" ? "anime" : "series");
}

/**
 * D-14 step 2: the one live candidate with the same `title_norm`, a compatible kind and, when both
 * sides know it, the same year. Zero or several = null, so the caller creates; never guess. An
 * empty `title_norm` (too short to compare) never matches.
 */
export function matchEntry(
  candidates: Iterable<SyncCandidate>,
  { titleNorm, kind, year }: SyncMatchInput,
): SyncCandidate | null {
  if (titleNorm === "") return null;
  const kinds = compatibleKinds(kind);
  const hits = [...candidates].filter(
    (candidate) =>
      candidate.titleNorm === titleNorm &&
      kinds.some((allowed) => allowed === candidate.kind) &&
      (year === undefined || candidate.year === null || candidate.year === year),
  );
  return hits.length === 1 ? (hits[0] ?? null) : null;
}
