import { describe, expect, it } from "vitest";
import {
  applyLocalPatch,
  insertEntry,
  matchesFilters,
  removeEntry,
  replaceEntry,
  sortEntries,
} from "@/utils/log/entry-list";
import { testEntry } from "@/utils/log/test-entry";

const dune = testEntry({ id: "a", title: "Dune", year: 2021, rating: 9, updatedAt: "2026-11-02" });
const arrival = testEntry({
  id: "b",
  title: "Arrival",
  year: 2016,
  rating: null,
  updatedAt: "2026-11-03",
});
const heat = testEntry({ id: "c", title: "Heat", year: null, rating: 7, updatedAt: "2026-11-01" });
const all = [dune, arrival, heat];
const titles = (list: readonly { title: string }[]) => list.map((entry) => entry.title);

describe("sortEntries", () => {
  it("orders by recent update, newest first", () => {
    expect(titles(sortEntries(all, "updated"))).toEqual(["Arrival", "Dune", "Heat"]);
  });

  it("orders by title A to Z", () => {
    expect(titles(sortEntries(all, "title"))).toEqual(["Arrival", "Dune", "Heat"]);
  });

  it("puts missing years and ratings last", () => {
    expect(titles(sortEntries(all, "year"))).toEqual(["Dune", "Arrival", "Heat"]);
    expect(titles(sortEntries(all, "rating"))).toEqual(["Dune", "Heat", "Arrival"]);
  });

  it("does not mutate its input", () => {
    sortEntries(all, "title");
    expect(titles(all)).toEqual(["Dune", "Arrival", "Heat"]);
  });
});

describe("matchesFilters", () => {
  const base = { kind: "movie", status: "", q: "" } as const;

  it("requires the kind", () => {
    expect(matchesFilters(dune, base)).toBe(true);
    expect(matchesFilters(dune, { ...base, kind: "series" })).toBe(false);
  });

  it("requires the status when one is chosen", () => {
    expect(matchesFilters(dune, { ...base, status: "completed" })).toBe(true);
    expect(matchesFilters(dune, { ...base, status: "planned" })).toBe(false);
  });

  it("matches the search text anywhere in the title, ignoring case", () => {
    expect(matchesFilters(dune, { ...base, q: "UN" })).toBe(true);
    expect(matchesFilters(dune, { ...base, q: "arr" })).toBe(false);
  });
});

describe("list edits", () => {
  it("inserts at the front and never duplicates an id", () => {
    expect(titles(insertEntry(all, testEntry({ id: "d", title: "Alien" })))).toEqual([
      "Alien",
      "Dune",
      "Arrival",
      "Heat",
    ]);
    expect(insertEntry(all, dune)).toHaveLength(3);
  });

  it("removes by id", () => {
    expect(titles(removeEntry(all, "b"))).toEqual(["Dune", "Heat"]);
  });

  it("replaces in place, keeping order", () => {
    expect(titles(replaceEntry(all, { ...arrival, title: "Arrival (2016)" }))).toEqual([
      "Dune",
      "Arrival (2016)",
      "Heat",
    ]);
  });
});

describe("applyLocalPatch", () => {
  it("shows the patched fields and keeps the rest", () => {
    const patched = applyLocalPatch(dune, { status: "on_hold", rating: null });
    expect(patched.status).toBe("on_hold");
    expect(patched.rating).toBeNull();
    expect(patched.title).toBe("Dune");
  });
});
