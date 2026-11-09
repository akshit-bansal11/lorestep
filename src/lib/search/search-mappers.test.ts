import { describe, expect, it } from "vitest";

import { mapIgdbSearch } from "@/lib/search/igdb";
import { mapMalSearch } from "@/lib/search/mal";
import { mergeMovieSeries } from "@/lib/search/merge";
import { mapOmdbSearch } from "@/lib/search/omdb";
import { mapTmdbSearch } from "@/lib/search/tmdb";
import type { SearchResult } from "@/types/metadata/metadata";

describe("mapTmdbSearch", () => {
  it("keeps movies and TV, drops people, and maps fields", () => {
    const results = mapTmdbSearch([
      {
        id: 1,
        media_type: "movie",
        title: "Heat",
        release_date: "1995-12-15",
        poster_path: "/h.jpg",
        overview: "Cops.",
        vote_average: 7.94,
      },
      { id: 2, media_type: "tv", name: "Heat Wave", first_air_date: "2001-01-01" },
      { id: 3, media_type: "person", name: "Al Pacino" },
    ]);

    expect(results).toEqual([
      {
        id: "1",
        title: "Heat",
        image: "https://image.tmdb.org/t/p/w500/h.jpg",
        year: "1995",
        type: "movie",
        overview: "Cops.",
        rating: 7.9,
      },
      {
        id: "2",
        title: "Heat Wave",
        image: null,
        year: "2001",
        type: "series",
        overview: "",
        rating: null,
      },
    ]);
  });
});

describe("mapOmdbSearch", () => {
  it("keeps movie and series hits, reads N/A posters and year ranges", () => {
    const results = mapOmdbSearch([
      { imdbID: "tt1", Title: "Heat", Year: "1995", Type: "movie", Poster: "N/A" },
      { imdbID: "tt2", Title: "Lost", Year: "2004–2010", Type: "series", Poster: "u/l.jpg" },
      { imdbID: "tt3", Title: "Heat: The Game", Year: "2000", Type: "game", Poster: "N/A" },
    ]);

    expect(results.map((item) => [item.id, item.type, item.year, item.image])).toEqual([
      ["tt1", "movie", "1995", null],
      ["tt2", "series", "2004", "u/l.jpg"],
    ]);
  });
});

describe("mapMalSearch", () => {
  it("maps nodes into the requested kind", () => {
    expect(
      mapMalSearch(
        [{ node: { id: 1, title: "Bebop", start_date: "1998-04-03", mean: 8.75, synopsis: "S" } }],
        "anime",
      ),
    ).toEqual([
      {
        id: "1",
        title: "Bebop",
        image: null,
        year: "1998",
        type: "anime",
        overview: "S",
        rating: 8.75,
      },
    ]);
  });
});

describe("mapIgdbSearch", () => {
  it("maps cover, year and a 0-10 rating", () => {
    expect(
      mapIgdbSearch([
        {
          id: 9,
          name: "Hades",
          first_release_date: 1600992000,
          cover: { url: "//images.igdb.com/t_thumb/c.jpg" },
          total_rating: 90,
        },
      ]),
    ).toEqual([
      {
        id: "9",
        title: "Hades",
        image: "https://images.igdb.com/t_cover_big/c.jpg",
        year: "2020",
        type: "game",
        overview: "",
        rating: 9,
      },
    ]);
  });
});

describe("mergeMovieSeries", () => {
  const hit = (over: Partial<SearchResult>): SearchResult => ({
    id: "1",
    title: "Heat",
    image: null,
    year: "1995",
    type: "movie",
    overview: "",
    rating: null,
    ...over,
  });

  it("shows one title once, keeping TMDB's id and filling its gaps from OMDb", () => {
    const merged = mergeMovieSeries(
      [hit({ id: "949" })],
      [hit({ id: "tt0113277", title: "  HEAT ", image: "p.jpg", rating: 8.3 })],
    );

    expect(merged).toEqual([hit({ id: "949", image: "p.jpg", rating: 8.3 })]);
  });

  it("keeps different years and types apart", () => {
    const merged = mergeMovieSeries(
      [hit({})],
      [hit({ id: "2", year: "2020" }), hit({ id: "3", type: "series" })],
    );

    expect(merged).toHaveLength(3);
  });
});
