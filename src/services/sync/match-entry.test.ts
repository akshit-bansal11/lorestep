import { describe, expect, it } from "vitest";

import { compatibleKinds, kindForNew, matchEntry } from "@/services/sync/match-entry";
import type { SyncCandidate } from "@/types/sync/sync";

const candidate = (over: Partial<SyncCandidate>): SyncCandidate => ({
  id: "e1",
  kind: "series",
  titleNorm: "the boys",
  year: null,
  status: "in_progress",
  statusAt: 1,
  keep: false,
  ...over,
});

describe("compatibleKinds", () => {
  it("pairs movie with movie and series with series or anime; no kind matches all three", () => {
    expect(compatibleKinds("movie")).toEqual(["movie"]);
    expect(compatibleKinds("series")).toEqual(["series", "anime"]);
    expect(compatibleKinds(undefined)).toEqual(["movie", "series", "anime"]);
  });
});

describe("kindForNew", () => {
  it("keeps a sent kind, else series, else anime on Crunchyroll", () => {
    expect(kindForNew("movie", "crunchyroll")).toBe("movie");
    expect(kindForNew(undefined, "netflix")).toBe("series");
    expect(kindForNew(undefined, "crunchyroll")).toBe("anime");
  });
});

describe("matchEntry", () => {
  const input = { titleNorm: "the boys", kind: undefined, year: undefined };

  it("returns null with no candidate", () => {
    expect(matchEntry([], input)).toBeNull();
  });

  it("returns the one candidate with the same title and a compatible kind", () => {
    const hit = candidate({ id: "e1", kind: "anime" });
    expect(matchEntry([hit, candidate({ id: "e2", titleNorm: "other" })], input)).toBe(hit);
  });

  it("never guesses between two candidates", () => {
    expect(matchEntry([candidate({ id: "e1" }), candidate({ id: "e2" })], input)).toBeNull();
  });

  it("rejects an incompatible kind and a different known year", () => {
    expect(matchEntry([candidate({ kind: "series" })], { ...input, kind: "movie" })).toBeNull();
    expect(matchEntry([candidate({ kind: "game" })], input)).toBeNull();
    expect(matchEntry([candidate({ year: 2019 })], { ...input, year: 2024 })).toBeNull();
    expect(matchEntry([candidate({ year: null })], { ...input, year: 2024 })).not.toBeNull();
  });

  it("never matches an empty normalised title", () => {
    expect(matchEntry([candidate({ titleNorm: "" })], { ...input, titleNorm: "" })).toBeNull();
  });
});
