import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENTRIES_STORAGE_KEY, IMPORT_STORAGE_KEY } from "@/constants/canon/storage";
import { useEntriesSync } from "@/hooks/canon/use-entries-sync";
import { fetchGameEntries, postLocalImport } from "@/lib/api/entries-sync-client";
import type { ImportResult } from "@/types/log/import";

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: { useSession: () => ({ data: { user: { id: "a" } }, isPending: false }) },
}));
vi.mock("@/lib/api/entries-sync-client", () => ({
  fetchGameEntries: vi.fn().mockResolvedValue([]),
  postLocalImport: vi.fn().mockResolvedValue({ inserted: 1, skipped: 0 }),
  putGameEntry: vi.fn().mockResolvedValue(204),
}));

const DECIDED = '"a":"imported"';
const syncRecord = () => localStorage.getItem(IMPORT_STORAGE_KEY) ?? "";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify({ hl1: { status: "playing" } }));
});

describe("useEntriesSync", () => {
  // A banner remounted while the import was in flight never ran `decide` itself; the stored
  // answer must still close it (e2e/import.spec.ts kept seeing "Never" after a 200).
  it("closes the question in every mounted banner once the answer is stored", async () => {
    const answered = renderHook(() => useEntriesSync());
    const other = renderHook(() => useEntriesSync());
    await waitFor(() => expect(other.result.current.prompt).toBe(true));
    expect(answered.result.current.prompt).toBe(true);

    act(() => answered.result.current.decide("imported"));

    await waitFor(() => expect(other.result.current.prompt).toBe(false));
    expect(answered.result.current.prompt).toBe(false);
  });

  it("stores the answer before the request, so a banner mounted mid-import never asks", async () => {
    let storedAtRequest = "";
    let release: (result: ImportResult | null) => void = () => undefined;
    vi.mocked(postLocalImport).mockImplementationOnce(() => {
      storedAtRequest = syncRecord();
      return new Promise((resolve) => {
        release = resolve;
      });
    });
    const answered = renderHook(() => useEntriesSync());
    await waitFor(() => expect(answered.result.current.prompt).toBe(true));

    act(() => answered.result.current.decide("imported"));
    expect(storedAtRequest).toContain(DECIDED);

    // Its session start must see the stored answer and sync, not return "prompt".
    const fresh = renderHook(() => useEntriesSync());
    expect(fresh.result.current.prompt).toBe(false);
    await waitFor(() => expect(fetchGameEntries).toHaveBeenCalled());
    await act(async () => release({ inserted: 1, skipped: 0 }));
    expect(fresh.result.current.prompt).toBe(false);
    expect(answered.result.current.prompt).toBe(false);
  });

  // Last: the failure flag is module state and stays set for the rest of the file.
  it("takes the answer back and reopens the question with an error when the import fails", async () => {
    vi.mocked(postLocalImport).mockResolvedValueOnce(null);
    const answered = renderHook(() => useEntriesSync());
    await waitFor(() => expect(answered.result.current.prompt).toBe(true));

    act(() => answered.result.current.decide("imported"));

    await waitFor(() => expect(answered.result.current.failed).toBe(true));
    expect(answered.result.current.prompt).toBe(true);
    expect(syncRecord()).not.toContain(DECIDED);
  });
});
