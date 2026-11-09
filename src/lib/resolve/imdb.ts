import { fetchOmdbTitle } from "@/lib/metadata/omdb";
import type { ParsedMediaUrl, ResolvedMedia } from "@/types/metadata/metadata";

/** An IMDb title page: OMDb knows the id and says whether it is a movie or a series. */
export async function resolveImdb({ id }: ParsedMediaUrl): Promise<ResolvedMedia | null> {
  const data = await fetchOmdbTitle({ i: id });
  return data === null ? null : { ...data, id };
}
