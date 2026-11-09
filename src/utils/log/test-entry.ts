import type { Entry } from "@/types/log/entry";

/** A complete entry for tests; override only what a case cares about. */
export function testEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    kind: "movie",
    title: "Dune",
    year: 2021,
    status: "completed",
    shelf: null,
    rating: 9,
    notes: "",
    progress: {},
    repeatCount: 0,
    device: null,
    storefront: null,
    gameId: null,
    ext: null,
    imageUrl: null,
    startedAt: null,
    completedAt: null,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
    ...overrides,
  };
}
