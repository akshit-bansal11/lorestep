import { describe, expect, it } from "vitest";

import { listItemSchema } from "@/schemas/log/list";
import type { SearchResult } from "@/types/metadata/metadata";
import { listItemFromResult } from "@/utils/log/list-item-from-result";

const base: SearchResult = {
  id: "438631",
  title: "Dune",
  image: "https://image.tmdb.org/t/p/w185/x.jpg",
  year: "2021",
  type: "movie",
  overview: "",
  rating: null,
};

describe("listItemFromResult", () => {
  it("builds a body the server schema accepts", () => {
    const item = listItemFromResult(base);
    expect(item).toMatchObject({ kind: "movie", year: 2021, extSource: "tmdb", extId: "438631" });
    expect(listItemSchema.safeParse(item).success).toBe(true);
  });

  it("uses MAL for anime and drops a non-https image and a bad year", () => {
    const item = listItemFromResult({
      ...base,
      type: "anime",
      id: "52991",
      year: "",
      image: "http://x/y.jpg",
    });
    expect(item.extSource).toBe("mal");
    expect(item.year).toBeNull();
    expect(item.imageUrl).toBeUndefined();
    expect(listItemSchema.safeParse(item).success).toBe(true);
  });
});
