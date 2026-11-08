import { describe, expect, it } from "vitest";

import { mapIgdbGame } from "@/lib/metadata/igdb";
import { mapMalDetails } from "@/lib/metadata/mal";
import { getMissingFields, mergeMetadata } from "@/lib/metadata/merge";
import { mapOmdbTitle } from "@/lib/metadata/omdb";
import { mapTmdbDetails } from "@/lib/metadata/tmdb";

describe("mapTmdbDetails", () => {
  it("maps a movie with credits", () => {
    const result = mapTmdbDetails(
      {
        title: "Dune",
        overview: "Spice.",
        release_date: "2021-09-15",
        runtime: 155,
        poster_path: "/dune.jpg",
        vote_average: 7.84,
        genres: [{ id: 878, name: "Science Fiction" }],
        production_companies: [{ name: "Legendary" }],
      },
      "movie",
      {
        cast: [{ name: "A" }, { name: "B" }],
        crew: [{ name: "Denis", job: "Director" }],
      },
    );

    expect(result).toMatchObject({
      title: "Dune",
      year: "2021",
      type: "movie",
      image: "https://image.tmdb.org/t/p/w500/dune.jpg",
      rating: 7.8,
      lengthMinutes: 155,
      episodeCount: null,
      genresThemes: ["Science Fiction"],
      genreIds: [878],
      cast: ["A", "B"],
      director: "Denis",
      producer: "Legendary",
    });
  });

  it("maps a series and falls back to the executive producer for the director", () => {
    const result = mapTmdbDetails(
      { name: "Severance", first_air_date: "2022-02-18", number_of_episodes: 19 },
      "series",
      { crew: [{ name: "Ben", job: "Executive Producer" }] },
    );

    expect(result).toMatchObject({
      title: "Severance",
      year: "2022",
      episodeCount: 19,
      director: "Ben",
      image: null,
    });
  });
});

describe("mapOmdbTitle", () => {
  const payload = {
    Title: "Heat",
    Year: "1995",
    Plot: "Cops and robbers.",
    Runtime: "170 min",
    Genre: "Crime, Drama",
    Actors: "Al Pacino, Robert De Niro",
    Poster: "https://m.media-amazon.com/heat.jpg",
    Type: "movie",
    imdbRating: "8.3",
    Director: "Michael Mann",
    Production: "N/A",
    Writer: "Michael Mann",
  };

  it("maps fields, reading N/A as missing", () => {
    expect(mapOmdbTitle(payload)).toMatchObject({
      title: "Heat",
      year: "1995",
      type: "movie",
      rating: 8.3,
      imdbRating: 8.3,
      lengthMinutes: 170,
      genresThemes: ["Crime", "Drama"],
      cast: ["Al Pacino", "Robert De Niro"],
      producer: "Michael Mann",
    });
  });

  it("takes the type from the payload unless told, and maps N/A ratings to null", () => {
    const series = mapOmdbTitle({
      ...payload,
      Type: "series",
      Year: "2008–2013",
      imdbRating: "N/A",
    });

    expect(series).toMatchObject({ type: "series", year: "2008", rating: null });
    expect(mapOmdbTitle({ ...payload, Type: "series" }, "movie").type).toBe("movie");
  });
});

describe("mapMalDetails", () => {
  it("maps anime with studio, runtime and Jikan staff", () => {
    const result = mapMalDetails(
      {
        title: "Cowboy Bebop",
        synopsis: "Bounty hunters.",
        start_date: "1998-04-03",
        mean: 8.75,
        main_picture: { medium: "https://cdn.myanimelist.net/a.jpg" },
        num_episodes: 26,
        average_episode_duration: 1440,
        genres: [{ name: "Action" }],
        studios: [{ name: "Sunrise" }],
      },
      "anime",
      { characters: ["Spike", "Jet"], directors: ["Shinichiro Watanabe"] },
    );

    expect(result).toMatchObject({
      title: "Cowboy Bebop",
      year: "1998",
      type: "anime",
      rating: 8.8,
      lengthMinutes: 24,
      episodeCount: 26,
      chapterCount: null,
      cast: ["Spike", "Jet"],
      director: "Shinichiro Watanabe",
      producer: "Sunrise",
    });
  });

  it("maps manga with authors and serialization", () => {
    const result = mapMalDetails(
      {
        title: "Berserk",
        num_chapters: 364,
        authors: [{ node: { first_name: "Kentaro", last_name: "Miura" } }],
        serialization: [{ node: { name: "Young Animal" } }],
      },
      "manga",
      { characters: [], directors: [] },
    );

    expect(result).toMatchObject({
      type: "manga",
      chapterCount: 364,
      episodeCount: null,
      director: "Kentaro Miura",
      producer: "Young Animal",
    });
  });
});

describe("mapIgdbGame", () => {
  it("maps cover, 0-100 rating and company roles", () => {
    const result = mapIgdbGame({
      name: "Hades",
      summary: "Escape.",
      first_release_date: 1600992000,
      cover: { url: "//images.igdb.com/igdb/image/upload/t_thumb/co1.jpg" },
      aggregated_rating: 93.46,
      genres: [{ name: "Roguelike" }],
      involved_companies: [
        { company: { name: "Supergiant" }, developer: true, publisher: false },
        { company: { name: "Supergiant Publishing" }, developer: false, publisher: true },
      ],
    });

    expect(result).toMatchObject({
      title: "Hades",
      year: "2020",
      type: "game",
      image: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1.jpg",
      rating: 9.3,
      director: "Supergiant",
      producer: "Supergiant Publishing",
    });
  });
});

describe("mergeMetadata and getMissingFields", () => {
  it("fills gaps from the secondary and keeps the longer text and higher rating", () => {
    const merged = mergeMetadata(
      { title: "Heat", description: "Short.", rating: 7.9, genresThemes: ["Crime"], image: null },
      {
        title: "Heat",
        description: "A longer plot.",
        rating: 8.3,
        genresThemes: ["Drama"],
        image: "p",
      },
    );

    expect(merged).toMatchObject({
      description: "A longer plot.",
      rating: 8.3,
      image: "p",
      genresThemes: ["Crime", "Drama"],
    });
  });

  it("returns whichever side exists, or null", () => {
    expect(mergeMetadata(null, { title: "x" })).toEqual({ title: "x" });
    expect(mergeMetadata(null, null)).toBeNull();
  });

  it("lists what a movie still lacks", () => {
    expect(getMissingFields({ title: "x", type: "movie" }, "movie")).toEqual([
      "description",
      "year",
      "rating",
      "genresThemes",
      "lengthMinutes",
    ]);
  });
});
