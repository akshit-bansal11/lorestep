import { describe, expect, it } from "vitest";

import { SYNC_LIMITS } from "@/constants/sync/sync";
import { planPush } from "@/services/sync/plan-push";
import type { SyncCandidate, SyncLink, SyncMark } from "@/types/sync/sync";

const NOW = 1_800_000_000_000;

const mark = (over: Partial<SyncMark>): SyncMark => ({
  platform: "netflix",
  platformId: "81234",
  title: "The Boys",
  kind: "series",
  year: undefined,
  url: undefined,
  status: "in_progress",
  at: NOW - 1000,
  ...over,
});

const entry = (over: Partial<SyncCandidate>): SyncCandidate => ({
  id: "e1",
  kind: "series",
  titleNorm: "the boys",
  year: null,
  status: "planned",
  statusAt: NOW - 5000,
  keep: false,
  ...over,
});

const link = (over: Partial<SyncLink>): SyncLink => ({
  platform: "netflix",
  platformId: "81234",
  entryId: "e1",
  ...over,
});

function ids() {
  let n = 0;
  return () => {
    n += 1;
    return `new-${n}`;
  };
}

const plan = (marks: SyncMark[], links: SyncLink[], entries: SyncCandidate[]) =>
  planPush(marks, links, entries, NOW, ids());

describe("planPush last write wins", () => {
  it("applies a newer mark over the server's status", () => {
    const result = plan([mark({ at: NOW - 1000 })], [link({})], [entry({})]);
    expect(result.applied).toBe(1);
    expect(result.ops).toContainEqual(
      expect.objectContaining({ type: "status", id: "e1", status: "in_progress", remove: false }),
    );
    expect(result.results[0]).toMatchObject({ entryId: "e1", status: "in_progress" });
  });

  it("skips a mark older than the server's status and reports the server's", () => {
    const result = plan([mark({ at: NOW - 9000 })], [link({})], [entry({})]);
    expect(result).toMatchObject({ applied: 0, skipped: 1, ops: [] });
    expect(result.results[0]).toMatchObject({ entryId: "e1", status: "planned" });
  });

  it("skips an equal timestamp, so resending the same push writes nothing", () => {
    const first = plan([mark({})], [], []);
    expect(first.applied).toBe(1);
    const created = first.ops.find((op) => op.type === "create");
    if (created?.type !== "create") throw new Error("expected a create");
    const again = plan(
      [mark({})],
      [link({ entryId: created.id })],
      [entry({ id: created.id, status: "in_progress", statusAt: created.statusAt })],
    );
    expect(again).toMatchObject({ applied: 0, skipped: 1, ops: [] });
  });

  it("applies marks in order: a later mark in the same push wins over an earlier one", () => {
    const result = plan(
      [mark({ status: "completed", at: NOW - 100 }), mark({ status: "dropped", at: NOW - 200 })],
      [link({})],
      [entry({})],
    );
    expect(result.results.map((r) => r.status)).toEqual(["completed", "completed"]);
    expect(result).toMatchObject({ applied: 1, skipped: 1 });
  });

  it("clamps a client clock far in the future", () => {
    const result = plan([mark({ at: NOW + 3_600_000 })], [], []);
    expect(result.ops[0]).toMatchObject({ statusAt: NOW + SYNC_LIMITS.futureSkewMs });
  });
});

describe("planPush matching (D-14)", () => {
  it("links the same title on two platforms to one entry", () => {
    const result = plan(
      [mark({}), mark({ platform: "primevideo", platformId: "B0X1", at: NOW - 500 })],
      [],
      [],
    );
    const creates = result.ops.filter((op) => op.type === "create");
    expect(creates).toHaveLength(1);
    expect(new Set(result.results.map((r) => r.entryId))).toEqual(new Set(["new-1"]));
    expect(result.ops.filter((op) => op.type === "link")).toHaveLength(2);
  });

  it("matches one existing live candidate by title and links it", () => {
    const result = plan([mark({ platformId: "new-tile" })], [], [entry({ kind: "anime" })]);
    expect(result.creates).toBe(0);
    expect(result.ops).toContainEqual(
      expect.objectContaining({ type: "link", platformId: "new-tile", entryId: "e1" }),
    );
  });

  it("creates a new entry when two candidates share the title", () => {
    const result = plan([mark({})], [], [entry({ id: "e1" }), entry({ id: "e2" })]);
    expect(result.creates).toBe(1);
    expect(result.results[0]?.entryId).toBe("new-1");
  });

  it("creates when the kind is incompatible", () => {
    const result = plan([mark({ kind: "movie" })], [], [entry({ kind: "series" })]);
    expect(result.ops[0]).toMatchObject({ type: "create", kind: "movie" });
  });

  it("creates an unknown kind as series, or anime on Crunchyroll", () => {
    const series = plan([mark({ kind: undefined })], [], []);
    const anime = plan([mark({ kind: undefined, platform: "crunchyroll" })], [], []);
    expect(series.ops[0]).toMatchObject({ type: "create", kind: "series" });
    expect(anime.ops[0]).toMatchObject({ type: "create", kind: "anime" });
  });

  it("ignores a link to an entry the caller does not own and re-points it to their own", () => {
    const result = plan([mark({ title: "Unrelated" })], [link({ entryId: "foreign" })], []);
    expect(JSON.stringify(result)).not.toContain("foreign");
    expect(result.ops).toContainEqual(expect.objectContaining({ type: "link", entryId: "new-1" }));
  });

  it("touches an entry that only gained a link, so other devices pull it", () => {
    const result = plan([mark({ platformId: "other", at: NOW - 9000 })], [], [entry({})]);
    expect(result.ops.map((op) => op.type)).toEqual(["link", "touch"]);
  });
});

describe("planPush clear (D-15) and tombstones", () => {
  it("soft-deletes a cleared entry with nothing else on it", () => {
    const result = plan([mark({ status: null })], [link({})], [entry({})]);
    expect(result.ops).toContainEqual(
      expect.objectContaining({ type: "status", status: null, remove: true }),
    );
  });

  it("keeps a cleared entry that has a rating, notes, shelf or list membership", () => {
    const result = plan([mark({ status: null })], [link({})], [entry({ keep: true })]);
    expect(result.ops).toContainEqual(
      expect.objectContaining({ type: "status", status: null, remove: false }),
    );
  });

  it("does not create anything for a clear of an unknown title", () => {
    const result = plan([mark({ status: null })], [], []);
    expect(result).toMatchObject({ ops: [], applied: 0, skipped: 1 });
    expect(result.results[0]).toMatchObject({ entryId: null, status: null });
  });

  it("a mark after a clear in the same push makes a fresh entry, not the tombstone", () => {
    const result = plan(
      [mark({ status: null, at: NOW - 900 }), mark({ status: "planned", at: NOW - 800 })],
      [link({})],
      [entry({})],
    );
    expect(result.results[1]?.entryId).toBe("new-1");
  });
});
