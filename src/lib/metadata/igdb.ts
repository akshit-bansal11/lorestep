import { safeFetchJson } from "@/lib/http/safe-fetch";
import { namesOf, round1 } from "@/lib/providers/format";
import { getIgdbAccess, igdbHeaders } from "@/lib/providers/igdb-auth";
import type { MetadataResult } from "@/types/metadata/metadata";

export interface IgdbGameDetails {
  name?: string;
  summary?: string;
  first_release_date?: number;
  cover?: { url?: string };
  genres?: Array<{ name?: string }>;
  aggregated_rating?: number;
  rating?: number;
  involved_companies?: Array<{
    company?: { name?: string };
    developer?: boolean;
    publisher?: boolean;
  }>;
}

const FIELDS =
  "name,summary,first_release_date,cover.url,genres.name,aggregated_rating,rating,involved_companies.company.name,involved_companies.developer,involved_companies.publisher";

/** IGDB covers arrive as protocol-relative thumbnails. */
export const coverUrl = (url?: string) =>
  url ? `${url.startsWith("//") ? "https:" : ""}${url}`.replace("t_thumb", "t_cover_big") : null;

/** IGDB rates 0-100; the app shows 0-10. */
export const igdbRating = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) ? round1(value / 10) : null;

/** Apicalypse strings have no escapes: drop quotes and backslashes instead. */
export const igdbText = (value: string) => value.replace(/["\\]/g, "").trim();

/** Pure: an IGDB game into the shared metadata shape. */
export function mapIgdbGame(data: IgdbGameDetails): MetadataResult {
  const company = (role: "developer" | "publisher") =>
    data.involved_companies?.find((entry) => entry[role])?.company?.name ?? null;

  return {
    title: data.name || "",
    description: data.summary || "",
    year:
      typeof data.first_release_date === "number"
        ? String(new Date(data.first_release_date * 1000).getUTCFullYear())
        : undefined,
    type: "game",
    image: coverUrl(data.cover?.url),
    rating: igdbRating(data.aggregated_rating ?? data.rating),
    genresThemes: namesOf(data.genres),
    cast: [],
    director: company("developer"),
    producer: company("publisher"),
  };
}

/** A game by IGDB id, else by title search. Null when unconfigured, failed or not found. */
export async function fetchIgdbMetadata(
  id: string | null,
  title: string | null,
): Promise<MetadataResult | null> {
  const access = await getIgdbAccess();
  if (access === null) return null;

  const text = title === null ? "" : igdbText(title);
  const filter = id !== null && /^\d+$/.test(id) ? `where id = ${id};` : `search "${text}";`;
  if (filter.startsWith("search") && text === "") return null;

  const res = await safeFetchJson<IgdbGameDetails[]>("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: igdbHeaders(access),
    body: `${filter} fields ${FIELDS}; limit 1;`,
  });
  const game = res.ok && Array.isArray(res.data) ? res.data[0] : undefined;
  return game ? mapIgdbGame(game) : null;
}
