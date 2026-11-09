import { describe, expect, it } from "vitest";
import { buildEntriesQuery } from "@/utils/log/entries-query";

describe("buildEntriesQuery", () => {
  it("always sends the kind and a page size", () => {
    expect(buildEntriesQuery({ kind: "anime", status: "", q: "" })).toBe("kind=anime&limit=50");
  });

  it("adds status, search text and the cursor only when set", () => {
    const params = new URLSearchParams(
      buildEntriesQuery({ kind: "game", status: "in_progress", q: "elden ring" }, "abc"),
    );
    expect(params.get("status")).toBe("in_progress");
    expect(params.get("q")).toBe("elden ring");
    expect(params.get("cursor")).toBe("abc");
  });
});
