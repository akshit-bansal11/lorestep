import { describe, expect, it } from "vitest";

import { parseMediaUrl } from "@/lib/resolve/parse-url";
import { extractTitle } from "@/lib/resolve/streaming";

const parse = (raw: string) => parseMediaUrl(new URL(raw));

describe("parseMediaUrl", () => {
  it("reads each supported provider's id", () => {
    expect(parse("https://www.imdb.com/title/tt0113277/?ref_=x")).toMatchObject({
      source: "imdb",
      id: "tt0113277",
      mediaType: null,
    });
    expect(parse("https://www.themoviedb.org/movie/949-heat")).toMatchObject({
      source: "tmdb",
      id: "949",
      mediaType: "movie",
    });
    expect(parse("https://www.themoviedb.org/tv/1396")).toMatchObject({ mediaType: "series" });
    expect(parse("https://myanimelist.net/manga/2/Berserk")).toMatchObject({
      source: "mal",
      id: "2",
      mediaType: "manga",
    });
  });

  it("canonicalises Netflix and Prime URLs onto their own host", () => {
    expect(parse("https://www.netflix.com/browse?jbv=80100172")).toMatchObject({
      source: "netflix",
      id: "80100172",
      cleanUrl: "https://www.netflix.com/title/80100172",
    });
    expect(parse("https://www.amazon.co.uk/gp/video/detail/B0ABC/ref=x")).toMatchObject({
      source: "prime",
      id: "B0ABC",
      cleanUrl: "https://www.amazon.co.uk/dp/B0ABC",
    });
  });

  it("answers null when the path names no title", () => {
    expect(parse("https://www.imdb.com/chart/top")).toBeNull();
    expect(parse("https://www.netflix.com/browse")).toBeNull();
    expect(parse("https://www.amazon.com/")).toBeNull();
  });
});

describe("extractTitle", () => {
  it("prefers JSON-LD, then og:title, then <title>, and strips the service name", () => {
    expect(
      extractTitle(
        '<script type="application/ld+json">{"name":"Dark &amp; Stormy"}</script><title>x</title>',
      ),
    ).toBe("Dark & Stormy");
    expect(extractTitle('<meta property="og:title" content="Netflix: Dark">')).toBe("Dark");
    expect(extractTitle("<title>Severance - Prime Video</title>")).toBe("Severance");
  });

  it("skips broken JSON-LD and answers null when nothing usable exists", () => {
    expect(
      extractTitle('<script type="application/ld+json">{oops</script><title>Heat</title>'),
    ).toBe("Heat");
    expect(extractTitle("<html></html>")).toBeNull();
  });
});
