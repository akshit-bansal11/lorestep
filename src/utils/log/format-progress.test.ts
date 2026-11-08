import { describe, expect, it } from "vitest";
import { formatProgress } from "@/utils/log/format-progress";

describe("formatProgress", () => {
  it.each([
    ["series", { seasons: 1, episodes: 14 }, "S1 E14"],
    ["series", { episodes: 3 }, "E3"],
    ["anime", { episodes: 12 }, "E12"],
    ["manga", { chapters: 90, volumes: 9 }, "Ch 90 · Vol 9"],
    ["game", { playMinutes: 125 }, "2h 5m"],
    ["game", { playMinutes: 120 }, "2h"],
    ["game", { playMinutes: 45 }, "45m"],
    ["movie", { episodes: 4 }, ""],
    ["series", {}, ""],
  ] as const)("%s %j reads %j", (kind, progress, expected) => {
    expect(formatProgress(kind, progress)).toBe(expected);
  });
});
