import { describe, expect, it } from "vitest";

import { normTitle } from "@/utils/log/norm-title";

// Fixtures copied from dogear/tests/core.test.js ("normTitle" and the Indic case).
describe("normTitle", () => {
  it.each([
    "The Boys - Season 1",
    "The Boys (Hindi)",
    "THE BOYS: S2",
    "The Boys — Season 3 Episode 2",
  ])("reduces %s to the show", (title) => {
    expect(normTitle(title)).toBe("the boys");
  });

  it.each([
    ["Dune: Part Two", "dune part two"],
    ["Amélie", "amelie"],
    ["Tom & Jerry", "tom and jerry"],
    ["Ёлки", "елки"],
  ])("normalises %s", (title, norm) => {
    expect(normTitle(title)).toBe(norm);
  });

  it.each(["", "A", "   "])("returns empty for %j", (title) => {
    expect(normTitle(title)).toBe("");
  });

  it("keeps Indic vowel signs, so different words stay different", () => {
    const norms = ["काल", "किल", "कुल"].map(normTitle);
    for (const norm of norms) expect(norm).not.toBe("");
    expect(new Set(norms).size).toBe(3);
  });

  it("drops zero-width and bidi characters inside a word", () => {
    expect(normTitle("Du​ne‮")).toBe("dune");
  });
});
