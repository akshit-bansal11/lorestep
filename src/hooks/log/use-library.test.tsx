import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLibrary } from "@/hooks/log/use-library";
import {
  createEntry,
  deleteEntry,
  fetchEntries,
  patchEntry,
  restoreEntry,
} from "@/lib/api/log-client";
import type { ApiFailure } from "@/types/api/api";
import { testEntry } from "@/utils/log/test-entry";

vi.mock("@/lib/api/log-client", () => ({
  fetchEntries: vi.fn(),
  createEntry: vi.fn(),
  patchEntry: vi.fn(),
  deleteEntry: vi.fn(),
  restoreEntry: vi.fn(),
}));

const dune = testEntry({ id: "a", title: "Dune", status: "completed", updatedAt: "2026-11-02" });
const heat = testEntry({ id: "b", title: "Heat", status: "planned", updatedAt: "2026-11-01" });
const offline: ApiFailure = { status: 0, code: "", message: "", retryAfterSec: null };

async function loaded() {
  vi.mocked(fetchEntries).mockResolvedValue({
    ok: true,
    data: { items: [dune, heat], nextCursor: null },
  });
  const view = renderHook(() => useLibrary());
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

const titles = (view: Awaited<ReturnType<typeof loaded>>) =>
  view.result.current.items.map((entry) => entry.title);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("useLibrary", () => {
  it("loads the first page for the default kind", async () => {
    const view = await loaded();
    expect(titles(view)).toEqual(["Dune", "Heat"]);
    expect(vi.mocked(fetchEntries).mock.calls[0]?.[0]).toMatchObject({ kind: "movie" });
  });

  it("reports a failed load with its failure and offers a reload", async () => {
    vi.mocked(fetchEntries).mockResolvedValueOnce({ ok: false, failure: offline });
    const view = renderHook(() => useLibrary());
    await waitFor(() => expect(view.result.current.failure).toEqual(offline));
    expect(view.result.current.items).toEqual([]);

    vi.mocked(fetchEntries).mockResolvedValueOnce({
      ok: true,
      data: { items: [dune], nextCursor: null },
    });
    act(() => view.result.current.reload());
    // reload() clears the failure before the request settles, so wait for the data itself.
    await waitFor(() => expect(titles(view)).toEqual(["Dune"]));
    expect(view.result.current.failure).toBeNull();
  });

  it("shows an edit at once and keeps the server's copy", async () => {
    const view = await loaded();
    let finish: (value: Awaited<ReturnType<typeof patchEntry>>) => void = () => undefined;
    vi.mocked(patchEntry).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = view.result.current.update(dune, { status: "on_hold" });
    });
    expect(view.result.current.items.find((e) => e.id === "a")?.status).toBe("on_hold");

    await act(async () => {
      finish({ ok: true, data: { ...dune, status: "on_hold", updatedAt: "2026-11-05" } });
      await pending;
    });
    expect(view.result.current.items.find((e) => e.id === "a")?.updatedAt).toBe("2026-11-05");
  });

  it("rolls an edit back when the save fails", async () => {
    const view = await loaded();
    vi.mocked(patchEntry).mockResolvedValueOnce({ ok: false, failure: offline });

    let succeeded: boolean | undefined;
    await act(async () => {
      succeeded = (await view.result.current.update(dune, { status: "dropped" })).ok;
    });

    expect(succeeded).toBe(false);
    expect(view.result.current.items.find((e) => e.id === "a")?.status).toBe("completed");
  });

  it("removes a deleted entry and puts it back when the delete fails", async () => {
    const view = await loaded();
    vi.mocked(deleteEntry).mockResolvedValueOnce({ ok: false, failure: offline });

    await act(async () => {
      await view.result.current.remove(dune);
    });
    expect(titles(view)).toContain("Dune");

    vi.mocked(deleteEntry).mockResolvedValueOnce({ ok: true, data: null });
    await act(async () => {
      await view.result.current.remove(dune);
    });
    expect(titles(view)).toEqual(["Heat"]);
  });

  it("restores a deleted entry through the restore endpoint, keeping its id", async () => {
    const view = await loaded();
    vi.mocked(deleteEntry).mockResolvedValueOnce({ ok: true, data: null });
    await act(async () => {
      await view.result.current.remove(dune);
    });

    vi.mocked(restoreEntry).mockResolvedValueOnce({ ok: true, data: dune });
    await act(async () => {
      await view.result.current.restore(dune);
    });
    expect(vi.mocked(restoreEntry)).toHaveBeenCalledWith("a");
    expect(vi.mocked(createEntry)).not.toHaveBeenCalled();
    expect(view.result.current.items.some((entry) => entry.id === "a")).toBe(true);
  });

  it("lists a new entry only when it belongs under the current filters", async () => {
    const view = await loaded();
    vi.mocked(createEntry).mockResolvedValueOnce({
      ok: true,
      data: testEntry({ id: "s", kind: "series", title: "Severance" }),
    });
    await act(async () => {
      await view.result.current.create({ kind: "series", title: "Severance" });
    });
    expect(titles(view)).not.toContain("Severance");

    vi.mocked(createEntry).mockResolvedValueOnce({
      ok: true,
      data: testEntry({ id: "m", title: "Alien" }),
    });
    await act(async () => {
      await view.result.current.create({ kind: "movie", title: "Alien" });
    });
    expect(titles(view)).toContain("Alien");
  });
});
