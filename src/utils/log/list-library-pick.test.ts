import { describe, expect, it } from "vitest";

import { listItemSchema } from "@/schemas/log/list";
import type { ListItem } from "@/types/log/list";
import { filterEntriesByTitle, isInList, listItemFromEntry } from "@/utils/log/list-library-pick";
import { testEntry } from "@/utils/log/test-entry";

const entries = [
  testEntry({ id: "1", title: "Dune" }),
  testEntry({ id: "2", title: "Dune: Part Two" }),
  testEntry({ id: "3", title: "Arrival" }),
];

function item(over: Partial<ListItem>): ListItem {
  return {
    id: "i",
    kind: "movie",
    title: "X",
    year: null,
    ext: null,
    imageUrl: null,
    sortOrder: 0,
    addedAt: "",
    ...over,
  };
}

describe("filterEntriesByTitle", () => {
  it("matches on a normalised substring", () => {
    expect(filterEntriesByTitle(entries, "  DUNE ").map((e) => e.id)).toEqual(["1", "2"]);
  });

  it("returns everything for an empty term and nothing for a miss", () => {
    expect(filterEntriesByTitle(entries, "")).toHaveLength(3);
    expect(filterEntriesByTitle(entries, "zzz")).toEqual([]);
  });
});

describe("isInList", () => {
  it("matches by provider id when both have one", () => {
    const entry = testEntry({ ext: { source: "tmdb", id: "1" } });
    const same = item({ ext: { source: "tmdb", id: "1" }, title: "other" });
    expect(isInList(entry, [same])).toBe(true);
    expect(isInList(entry, [item({ ext: { source: "tmdb", id: "2" } })])).toBe(false);
  });

  it("falls back to kind and normalised title", () => {
    const entry = testEntry({ title: "Dune", kind: "movie", ext: null });
    expect(isInList(entry, [item({ title: "dune" })])).toBe(true);
    expect(isInList(entry, [item({ title: "dune", kind: "series" })])).toBe(false);
  });
});

describe("listItemFromEntry", () => {
  it("builds a body the server schema accepts", () => {
    const body = listItemFromEntry(testEntry({ ext: { source: "tmdb", id: "9" } }));
    expect(body).not.toBeNull();
    expect(listItemSchema.safeParse(body).success).toBe(true);
  });

  it("returns null for an unknown kind", () => {
    expect(listItemFromEntry(testEntry({ kind: "podcast" }))).toBeNull();
  });
});
