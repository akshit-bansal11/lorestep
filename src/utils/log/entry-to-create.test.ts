import { describe, expect, it } from "vitest";
import { entryToCreate } from "@/utils/log/entry-to-create";
import { testEntry } from "@/utils/log/test-entry";

describe("entryToCreate", () => {
  it("carries every restorable field", () => {
    const entry = testEntry({
      rating: 8,
      notes: "rewatch",
      progress: { episodes: 2 },
      ext: { source: "tmdb", id: "438631" },
    });
    expect(entryToCreate(entry)).toMatchObject({
      kind: "movie",
      title: "Dune",
      year: 2021,
      status: "completed",
      rating: 8,
      notes: "rewatch",
      progress: { episodes: 2 },
      ext: { source: "tmdb", id: "438631" },
    });
  });

  it("drops an unknown external source rather than posting it", () => {
    expect(entryToCreate(testEntry({ ext: { source: "imdb", id: "tt1" } }))?.ext).toBeNull();
  });

  it("returns null for a kind it cannot recreate", () => {
    expect(entryToCreate(testEntry({ kind: "podcast" }))).toBeNull();
  });
});
