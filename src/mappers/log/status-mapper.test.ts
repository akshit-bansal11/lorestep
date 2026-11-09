import { describe, expect, it } from "vitest";

import { CANONICAL_STATUSES, EXTENSION_STATUSES, LIBRARY_STATUSES } from "@/constants/log/statuses";
import { MEDIA_KINDS } from "@/constants/metadata/metadata";
import {
  fromExtension,
  fromPlotline,
  toCanonical,
  toExtension,
  toLibraryStatus,
  toPlotline,
} from "@/mappers/log/status-mapper";

describe("status mapper", () => {
  it.each(LIBRARY_STATUSES)("round-trips the library id %s", (status) => {
    expect(toLibraryStatus(toCanonical(status))).toBe(status);
  });

  it.each([
    ["playing", "in_progress", null],
    ["backlogged", "planned", "own"],
    ["wishlist", "planned", "wishlist"],
    ["own", null, "own"],
    ["trash", "dropped", "trash"],
  ] as const)("stores %s as (%s, %s)", (status, canonical, shelf) => {
    expect(toCanonical(status)).toEqual({ status: canonical, shelf });
  });

  it("maps nothing set to null", () => {
    expect(toLibraryStatus({ status: null, shelf: null })).toBeNull();
  });

  it.each(EXTENSION_STATUSES)("round-trips the extension id %s", (status) => {
    expect(toExtension(fromExtension(status))).toBe(status);
  });

  it.each(CANONICAL_STATUSES)("round-trips %s through the extension", (status) => {
    expect(fromExtension(toExtension(status))).toBe(status);
  });

  const plotlineCases = MEDIA_KINDS.flatMap((kind) =>
    CANONICAL_STATUSES.map((status) => [kind, status] as const),
  );

  it.each(plotlineCases)("round-trips %s %s through Plotline", (kind, status) => {
    const id = toPlotline(status, kind);
    expect(fromPlotline(id, kind)).toEqual({ status, shelf: null, repeat: false });
    expect(toPlotline(status, kind)).toBe(id);
  });

  it("uses Plotline's per-kind verbs", () => {
    expect(toPlotline("in_progress", "manga")).toBe("reading");
    expect(toPlotline("planned", "game")).toBe("plan_to_play");
    expect(toPlotline("on_hold", "series")).toBe("on_hold");
  });

  it("keeps repeats and game shelves from Plotline", () => {
    expect(fromPlotline("rewatching", "movie")).toEqual({
      status: "in_progress",
      shelf: null,
      repeat: true,
    });
    expect(fromPlotline("backlogged", "game")).toEqual({
      status: "planned",
      shelf: "own",
      repeat: false,
    });
    expect(fromPlotline("wishlist", "movie").shelf).toBeNull();
  });
});
