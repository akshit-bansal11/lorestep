import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENTRIES_STORAGE_KEY } from "@/constants/canon/storage";
import { useEntriesSync } from "@/hooks/canon/use-entries-sync";

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: { useSession: () => ({ data: { user: { id: "a" } }, isPending: false }) },
}));
vi.mock("@/lib/api/entries-sync-client", () => ({
  fetchGameEntries: vi.fn().mockResolvedValue([]),
  postLocalImport: vi.fn().mockResolvedValue({ inserted: 1, skipped: 0 }),
  putGameEntry: vi.fn().mockResolvedValue(204),
}));

beforeEach(() => {
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
});
