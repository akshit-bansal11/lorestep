import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { enrichEntries } from "@/services/metadata/enrich-entries";
import type { EnrichCandidate } from "@/types/metadata/enrich";

// `select` answers the queued candidates; `update().set()` records what each write would set.
// Provider calls go through a stubbed `safeFetchJson`, answered by URL.
const state = vi.hoisted(() => ({
  rows: [] as unknown[],
  sets: [] as Record<string, unknown>[],
  tmdb: [] as unknown[],
  // Per-query TMDB answers, by the query as it appears in the URL; `tmdb` answers the rest.
  tmdbFor: {} as Record<string, unknown[]>,
  mal: [] as unknown[],
  urls: [] as string[],
}));

vi.mock("@/lib/db/client", () => {
  const select = () => {
    const chain = {
      from: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: () => Promise.resolve(state.rows),
    };
    return chain;
  };
  return {
    db: () => ({
      select,
      update: () => ({
        set: (values: Record<string, unknown>) => {
          state.sets.push(values);
          return { where: () => Promise.resolve([]) };
        },
      }),
    }),
  };
});

vi.mock("@/lib/http/safe-fetch", () => ({
  safeFetchJson: vi.fn((url: string) => {
    state.urls.push(url);
    return Promise.resolve(
      url.includes("themoviedb")
        ? {
            ok: true,
            data: {
              results:
                Object.entries(state.tmdbFor).find(([query]) => url.includes(query))?.[1] ??
                state.tmdb,
            },
          }
        : { ok: true, data: { data: state.mal } },
    );
  }),
}));

const render = (value: unknown) => {
  if (!(value instanceof SQL)) throw new Error("expected SQL");
  return new PgDialect().sqlToQuery(value);
};

const candidate = (over: Partial<EnrichCandidate>): EnrichCandidate => ({
  id: "00000000-0000-4000-8000-000000000001",
  userId: "user-a",
  kind: "series",
  title: "The Boys",
  titleNorm: "the boys",
  keep: false,
  twin: false,
  ...over,
});

const anime = (over: Record<string, unknown>) => ({
  genre_ids: [16, 10759],
  original_language: "ja",
  origin_country: ["JP"],
  poster_path: "/poster.jpg",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TMDB_BEARER_TOKEN", "token");
  vi.stubEnv("TMDB_API_KEY", "");
  vi.stubEnv("MAL_CLIENT_ID", "");
  state.rows = [];
  state.sets = [];
  state.tmdb = [];
  state.tmdbFor = {};
  state.mal = [];
  state.urls = [];
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("enrichEntries", () => {
  it("fills year and poster from an exact title match, and leaves the kind alone", async () => {
    state.rows = [candidate({})];
    state.tmdb = [
      {
        name: "The Boys",
        first_air_date: "2019-07-25",
        poster_path: "/boys.jpg",
        genre_ids: [10765],
        original_language: "en",
        origin_country: ["US"],
      },
    ];
    const result = await enrichEntries("user-a");

    expect(result).toMatchObject({ scanned: 1, filled: 1, upgraded: 0 });
    const [set] = state.sets;
    expect(render(set?.year).params).toContain(2019);
    expect(render(set?.imageUrl).params).toContain("https://image.tmdb.org/t/p/w500/boys.jpg");
    expect(render(set?.year).sql).toContain('COALESCE("entries"."year"');
    expect(set?.kind).toBeUndefined();
    expect(set?.enrichedAt).toBeInstanceOf(Date);
    expect(state.urls[0]).toContain("/search/tv");
  });

  it("skips a title that is not an exact match, but marks it attempted", async () => {
    state.rows = [candidate({ title: "Dark", titleNorm: "dark" })];
    state.tmdb = [anime({ name: "Dark Matter", first_air_date: "2024-05-08" })];
    const result = await enrichEntries();

    expect(result).toMatchObject({ scanned: 1, filled: 0, upgraded: 0 });
    expect(Object.keys(state.sets[0] ?? {})).toEqual(["enrichedAt"]);
  });

  it("moves a series to anime when TMDB says Animation in Japanese", async () => {
    state.rows = [candidate({ title: "Black Clover", titleNorm: "black clover" })];
    state.tmdb = [anime({ name: "Black Clover", first_air_date: "2017-10-03" })];
    const result = await enrichEntries("user-a");

    expect(result.upgraded).toBe(1);
    const kind = render(state.sets[0]?.kind).sql;
    expect(kind).toContain("'anime'");
    // The statement re-checks the guards, so an edit or twin made meanwhile still wins.
    expect(kind).toContain('"entries"."kind"');
    expect(kind).toContain("twin.kind = 'anime'");
  });

  it("moves Korean and Chinese animation too", async () => {
    state.rows = [
      candidate({ title: "Lookism", titleNorm: "lookism" }),
      candidate({
        id: "00000000-0000-4000-8000-000000000002",
        title: "Link Click",
        titleNorm: "link click",
      }),
    ];
    state.tmdbFor = {
      Lookism: [anime({ name: "Lookism", original_language: "ko", origin_country: ["KR"] })],
      "Link+Click": [
        anime({ name: "Link Click", original_language: "zh", origin_country: ["CN"] }),
      ],
    };
    const result = await enrichEntries("user-a");

    expect(result.upgraded).toBe(2);
    expect(state.sets.every((set) => set.kind instanceof SQL)).toBe(true);
  });

  it("moves a movie to anime under the same rule, searching TMDB movies", async () => {
    state.rows = [candidate({ kind: "movie", title: "Suzume", titleNorm: "suzume" })];
    state.tmdb = [anime({ title: "Suzume", release_date: "2022-11-11", origin_country: [] })];
    const result = await enrichEntries("user-a");

    expect(state.urls[0]).toContain("/search/movie");
    expect(result.upgraded).toBe(1);
    expect(render(state.sets[0]?.year).params).toContain(2022);
  });

  it("moves an entry MyAnimeList lists under an alternative title, with MAL's poster", async () => {
    vi.stubEnv("MAL_CLIENT_ID", "mal-id");
    state.rows = [
      candidate({
        title: "Demon Slayer: Kimetsu no Yaiba",
        titleNorm: "demon slayer kimetsu no yaiba",
      }),
    ];
    state.tmdb = [];
    state.mal = [
      {
        node: {
          title: "Kimetsu no Yaiba",
          alternative_titles: { en: "Demon Slayer: Kimetsu no Yaiba", synonyms: [] },
          main_picture: { large: "https://cdn.myanimelist.net/images/anime/1286/99889l.jpg" },
          start_date: "2019-04-06",
        },
      },
    ];
    const result = await enrichEntries("user-a");

    expect(result).toMatchObject({ filled: 1, upgraded: 1 });
    expect(render(state.sets[0]?.imageUrl).params).toContain(
      "https://cdn.myanimelist.net/images/anime/1286/99889l.jpg",
    );
  });

  it("does not move an entry the user edited (rating, notes, shelf or list)", async () => {
    state.rows = [
      candidate({ title: "Blue Eye Samurai", titleNorm: "blue eye samurai", keep: true }),
    ];
    state.tmdb = [anime({ name: "Blue Eye Samurai", first_air_date: "2023-11-03" })];
    const result = await enrichEntries("user-a");

    expect(result).toMatchObject({ filled: 1, upgraded: 0 });
    expect(state.sets[0]?.kind).toBeUndefined();
  });

  it("does not move an entry when an anime entry with the same title exists", async () => {
    state.rows = [candidate({ title: "Pluto", titleNorm: "pluto", twin: true })];
    state.tmdb = [anime({ name: "Pluto", first_air_date: "2023-10-26" })];
    const result = await enrichEntries("user-a");

    expect(result.upgraded).toBe(0);
    expect(state.sets[0]?.kind).toBeUndefined();
  });

  it("is a silent no-op without a TMDB or MAL key", async () => {
    vi.stubEnv("TMDB_BEARER_TOKEN", "");
    state.rows = [candidate({})];
    const warn = vi.spyOn(console, "warn");
    const result = await enrichEntries("user-a");

    expect(result).toEqual({ scanned: 0, filled: 0, upgraded: 0, failed: 0 });
    expect(state.sets).toHaveLength(0);
    expect(state.urls).toHaveLength(0);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
