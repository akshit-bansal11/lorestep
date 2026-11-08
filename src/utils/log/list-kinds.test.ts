import { describe, expect, it } from "vitest";

import { countLabel, kindsLabel } from "@/utils/log/list-kinds";

describe("list labels", () => {
  it("names the kinds, skipping unknown ones", () => {
    expect(kindsLabel(["movie", "anime", "bogus"])).toBe("movies, anime");
  });

  it("says any type for none", () => {
    expect(kindsLabel([])).toBe("Any type");
  });

  it("pluralises the count", () => {
    expect(countLabel(1)).toBe("1 title");
    expect(countLabel(0)).toBe("0 titles");
    expect(countLabel(12)).toBe("12 titles");
  });
});
