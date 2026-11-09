import { fetchTmdbMetadata } from "@/lib/metadata/tmdb";
import type { ParsedMediaUrl, ResolvedMedia } from "@/types/metadata/metadata";

/** A TMDB movie or TV page; the path already says which. */
export async function resolveTmdb({
  id,
  mediaType,
}: ParsedMediaUrl): Promise<ResolvedMedia | null> {
  if (mediaType !== "movie" && mediaType !== "series") return null;
  const data = await fetchTmdbMetadata(id, null, mediaType);
  return data === null ? null : { ...data, id };
}
