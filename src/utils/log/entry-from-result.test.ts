import { describe, expect, it } from "vitest";
import type { SearchResult } from "@/types/metadata/metadata";
import { entryFromResult } from "@/utils/log/entry-from-result";

const result: SearchResult = {
  id: "438631",
  title: "Dune",
  image: "https://image.tmdb.org/t/p/w500/x.jpg",
  year: "2021",
  type: "movie",
  overview: "",
  rating: null,
};

describe("entryFromResult", () => {
  it("builds from the search result alone when metadata is missing", () => {
    expect(entryFromResult(result, null)).toEqual({
      kind: "movie",
      title: "Dune",
      year: 2021,
      ext: { source: "tmdb", id: "438631" },
      imageUrl: "https://image.tmdb.org/t/p/w500/x.jpg",
    });
  });

  it("prefers the metadata's title, year and image", () => {
    const built = entryFromResult(result, {
      data: { title: "Dune: Part One", year: "2022", image: "https://example.com/y.jpg" },
    });
    expect(built).toMatchObject({
      title: "Dune: Part One",
      year: 2022,
      imageUrl: "https://example.com/y.jpg",
    });
  });

  it("names the provider by kind and id shape", () => {
    expect(entryFromResult({ ...result, id: "tt1160419" }, null).ext?.source).toBe("omdb");
    expect(entryFromResult({ ...result, type: "anime", id: "5114" }, null).ext?.source).toBe("mal");
    expect(entryFromResult({ ...result, type: "game", id: "119133" }, null).ext?.source).toBe(
      "igdb",
    );
  });

  it("refuses a non-https image and a year that is not four digits", () => {
    const built = entryFromResult({ ...result, image: "http://x.test/a.jpg", year: "TBA" }, null);
    expect(built.imageUrl).toBeNull();
    expect(built.year).toBeNull();
  });
});
