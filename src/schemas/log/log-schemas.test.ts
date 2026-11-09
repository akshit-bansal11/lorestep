import { describe, expect, it } from "vitest";

import { metadataParamsSchema } from "@/schemas/log/metadata";
import { resolveBodySchema } from "@/schemas/log/resolve";
import { searchParamsSchema } from "@/schemas/log/search";

describe("metadataParamsSchema", () => {
  it("accepts an id or a title", () => {
    expect(metadataParamsSchema.safeParse({ type: "movie", id: "278" }).success).toBe(true);
    expect(
      metadataParamsSchema.safeParse({ type: "game", title: "Hades", year: "2020" }).success,
    ).toBe(true);
  });

  it.each([
    ["no id or title", { type: "movie" }],
    ["an unknown type", { type: "podcast", id: "1" }],
    ["a missing type", { id: "1" }],
    ["a two-digit year", { type: "movie", id: "1", year: "99" }],
    ["a blank title", { type: "movie", title: "   " }],
    ["an oversized title", { type: "movie", title: "x".repeat(201) }],
  ])("rejects %s", (_name, params) => {
    expect(metadataParamsSchema.safeParse(params).success).toBe(false);
  });
});

describe("searchParamsSchema", () => {
  it("accepts a query with or without a type", () => {
    expect(searchParamsSchema.safeParse({ q: "dune" }).success).toBe(true);
    expect(searchParamsSchema.safeParse({ q: "dune", type: "series" }).success).toBe(true);
  });

  it.each([
    ["a missing query", {}],
    ["a blank query", { q: "  " }],
    ["an oversized query", { q: "x".repeat(201) }],
    ["an unknown type", { q: "dune", type: "book" }],
  ])("rejects %s", (_name, params) => {
    expect(searchParamsSchema.safeParse(params).success).toBe(false);
  });
});

describe("resolveBodySchema", () => {
  it("accepts a url string and trims it", () => {
    expect(resolveBodySchema.parse({ url: "  https://www.imdb.com/title/tt1/ " }).url).toBe(
      "https://www.imdb.com/title/tt1/",
    );
  });

  it.each([
    ["no url", {}],
    ["a non-string url", { url: 5 }],
    ["an empty url", { url: "" }],
    ["an oversized url", { url: `https://www.imdb.com/${"a".repeat(2100)}` }],
  ])("rejects %s", (_name, body) => {
    expect(resolveBodySchema.safeParse(body).success).toBe(false);
  });
});
