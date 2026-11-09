import { fetchMalMetadata } from "@/lib/metadata/mal";
import type { ParsedMediaUrl, ResolvedMedia } from "@/types/metadata/metadata";

/** A MyAnimeList anime or manga page. */
export async function resolveMal({ id, mediaType }: ParsedMediaUrl): Promise<ResolvedMedia | null> {
  if (mediaType !== "anime" && mediaType !== "manga") return null;
  const data = await fetchMalMetadata(id, mediaType);
  return data === null ? null : { ...data, id };
}
