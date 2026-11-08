import { describe, expect, it } from "vitest";

import { SYNC_LIMITS } from "@/constants/sync/sync";
import { syncPullQuerySchema } from "@/schemas/sync/pull";
import { syncPushSchema } from "@/schemas/sync/push";

const MARK = {
  platform: "netflix",
  platformId: "81234",
  title: "The Boys",
  kind: "series",
  url: "https://www.netflix.com/title/81234",
  status: "in_progress",
  at: 1_800_000_000_000,
};

describe("syncPushSchema", () => {
  it("accepts a Dogear mark and reads an empty kind or url as absent", () => {
    const parsed = syncPushSchema.parse({ marks: [{ ...MARK, kind: "", url: "" }] });
    expect(parsed.marks[0]).toMatchObject({ kind: undefined, url: undefined });
  });

  it("rejects an unknown platform, a bad platform id and a non-https url", () => {
    for (const bad of [
      { platform: "disneyplus" },
      { platformId: "../x" },
      { url: "http://www.netflix.com/title/1" },
    ]) {
      expect(syncPushSchema.safeParse({ marks: [{ ...MARK, ...bad }] }).success).toBe(false);
    }
  });

  it("cleans the title and rejects one with nothing left", () => {
    const parsed = syncPushSchema.parse({ marks: [{ ...MARK, title: " The​Boys\n" }] });
    expect(parsed.marks[0]?.title).toBe("TheBoys");
    expect(syncPushSchema.safeParse({ marks: [{ ...MARK, title: "​" }] }).success).toBe(false);
  });

  it("takes a null status as a clear and caps a push at 200 marks", () => {
    expect(syncPushSchema.safeParse({ marks: [{ ...MARK, status: null }] }).success).toBe(true);
    const marks = Array.from({ length: SYNC_LIMITS.pushMax + 1 }, () => MARK);
    expect(syncPushSchema.safeParse({ marks }).success).toBe(false);
  });
});

describe("syncPullQuerySchema", () => {
  it("splits kinds, clamps the limit and rejects an unknown kind", () => {
    expect(syncPullQuerySchema.parse({ kinds: "movie,series", limit: "9999" })).toEqual({
      kinds: ["movie", "series"],
      limit: SYNC_LIMITS.pullMax,
    });
    expect(syncPullQuerySchema.safeParse({ kinds: "movie,podcast" }).success).toBe(false);
  });
});
