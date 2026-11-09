import { HttpError } from "@/lib/http/http-error";
import { safeFetchJson } from "@/lib/http/safe-fetch";
import { namesOf, round1, yearOf } from "@/lib/providers/format";
import type { MetadataResult } from "@/types/metadata/metadata";

export type MalKind = "anime" | "manga";

export interface MalDetails {
  title?: string;
  synopsis?: string;
  start_date?: string;
  mean?: number;
  main_picture?: { medium?: string };
  num_episodes?: number;
  average_episode_duration?: number;
  num_chapters?: number;
  genres?: Array<{ name?: string }>;
  studios?: Array<{ name?: string }>;
  authors?: Array<{ node?: { first_name?: string; last_name?: string } }>;
  serialization?: Array<{ node?: { name?: string } }>;
}

/** Jikan fills what the official MAL API lacks: characters (both kinds) and staff (anime). */
export interface JikanExtras {
  characters: string[];
  directors: string[];
}

const fullName = (node?: { first_name?: string; last_name?: string }) =>
  `${node?.first_name ?? ""} ${node?.last_name ?? ""}`.trim();

/** Pure: MAL details + Jikan extras into the shared metadata shape. */
export function mapMalDetails(
  data: MalDetails,
  kind: MalKind,
  extras: JikanExtras,
): MetadataResult {
  const anime = kind === "anime";
  const authors = (data.authors ?? []).map((author) => fullName(author.node)).filter(Boolean);
  const director = anime ? extras.directors.slice(0, 2).join(", ") : authors.join(", ");

  return {
    title: data.title || "",
    description: data.synopsis || "",
    year: yearOf(data.start_date),
    type: kind,
    image: data.main_picture?.medium || null,
    rating: typeof data.mean === "number" ? round1(data.mean) : null,
    lengthMinutes:
      anime && typeof data.average_episode_duration === "number"
        ? Math.round(data.average_episode_duration / 60)
        : null,
    episodeCount: anime && typeof data.num_episodes === "number" ? data.num_episodes : null,
    chapterCount: !anime && typeof data.num_chapters === "number" ? data.num_chapters : null,
    genresThemes: namesOf(data.genres),
    cast: extras.characters.slice(0, 5),
    director: director === "" ? null : director,
    producer: anime
      ? (namesOf(data.studios)[0] ?? null)
      : (data.serialization?.[0]?.node?.name ?? null),
  };
}

async function fetchJikanExtras(id: string, kind: MalKind): Promise<JikanExtras> {
  const base = `https://api.jikan.moe/v4/${kind}/${encodeURIComponent(id)}`;
  const [characters, staff] = await Promise.all([
    safeFetchJson<{ data?: Array<{ character?: { name?: string } }> }>(`${base}/characters`),
    kind === "anime"
      ? safeFetchJson<{ data?: Array<{ person?: { name?: string }; positions?: string[] }> }>(
          `${base}/staff`,
        )
      : null,
  ]);

  return {
    characters:
      characters.ok && Array.isArray(characters.data.data)
        ? characters.data.data
            .slice(0, 10)
            .map((entry) => entry.character?.name)
            .filter((name): name is string => Boolean(name))
        : [],
    directors:
      staff?.ok && Array.isArray(staff.data.data)
        ? staff.data.data
            .filter((entry) => entry.positions?.some((p) => p.toLowerCase().includes("director")))
            .map((entry) => entry.person?.name)
            .filter((name): name is string => Boolean(name))
        : [],
  };
}

const ANIME_FIELDS =
  "title,main_picture,start_date,mean,synopsis,num_episodes,average_episode_duration,genres,studios";
const MANGA_FIELDS =
  "title,main_picture,start_date,mean,synopsis,num_chapters,genres,authors{first_name,last_name},serialization";

/**
 * Anime or manga by MAL id. Null when `MAL_CLIENT_ID` is unset; a failing MAL is a 502 (the
 * caller asked for a specific id, so "not found" would be a lie). Jikan is best effort.
 */
export async function fetchMalMetadata(id: string, kind: MalKind): Promise<MetadataResult | null> {
  const clientId = process.env.MAL_CLIENT_ID;
  if (!clientId || !/^\d+$/.test(id)) return null;

  const fields = kind === "anime" ? ANIME_FIELDS : MANGA_FIELDS;
  const [res, extras] = await Promise.all([
    safeFetchJson<MalDetails>(`https://api.myanimelist.net/v2/${kind}/${id}?fields=${fields}`, {
      headers: { "X-MAL-CLIENT-ID": clientId },
    }),
    fetchJikanExtras(id, kind),
  ]);
  if (!res.ok) {
    throw new HttpError(502, "provider_unavailable", "MyAnimeList did not answer. Try again.");
  }
  return mapMalDetails(res.data, kind, extras);
}
