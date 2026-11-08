import { describe, expect, it } from "vitest";
import { draftFromEntry, patchFromDraft, validateDraft } from "@/utils/log/entry-draft";
import { testEntry } from "@/utils/log/test-entry";

const series = testEntry({ kind: "series", progress: { seasons: 1, episodes: 14 }, rating: null });

describe("draftFromEntry", () => {
  it("turns every field into a string, empty for none", () => {
    const draft = draftFromEntry(series);
    expect(draft.rating).toBe("");
    expect(draft.seasons).toBe("1");
    expect(draft.episodes).toBe("14");
    expect(draft.chapters).toBe("");
  });
});

describe("validateDraft", () => {
  it("accepts an unchanged draft", () => {
    expect(validateDraft(series, draftFromEntry(series))).toEqual({});
  });

  it("names a rating outside 1 to 10 or not whole", () => {
    for (const rating of ["0", "11", "7.5", "abc", "-3"]) {
      const errors = validateDraft(series, { ...draftFromEntry(series), rating });
      expect(errors.rating).toMatch(/1 to 10/);
    }
  });

  it("checks only the counters the kind tracks", () => {
    const draft = { ...draftFromEntry(series), episodes: "-1", chapters: "zzz" };
    const errors = validateDraft(series, draft);
    expect(errors.episodes).toMatch(/Episode/);
    expect(errors.chapters).toBeUndefined();
  });
});

describe("patchFromDraft", () => {
  it("is empty when nothing changed", () => {
    expect(patchFromDraft(series, draftFromEntry(series))).toEqual({});
  });

  it("sends only the changed fields", () => {
    const draft = { ...draftFromEntry(series), status: "in_progress", rating: "8" };
    expect(patchFromDraft(series, draft)).toEqual({ status: "in_progress", rating: 8 });
  });

  it("clears with null and drops an emptied counter", () => {
    const draft = { ...draftFromEntry(series), status: "", episodes: "" };
    const patch = patchFromDraft({ ...series, status: "planned" }, draft);
    expect(patch.status).toBeNull();
    expect(patch.progress).toEqual({ seasons: 1 });
  });

  it("sends the whole progress object, keeping counters the kind does not edit", () => {
    const anime = testEntry({ kind: "anime", progress: { episodes: 3, chapters: 9 } });
    const patch = patchFromDraft(anime, { ...draftFromEntry(anime), episodes: "4" });
    expect(patch.progress).toEqual({ episodes: 4, chapters: 9 });
  });

  it("treats an unknown status string as none", () => {
    const patch = patchFromDraft(series, { ...draftFromEntry(series), status: "bogus" });
    expect(patch.status).toBeNull();
  });
});
