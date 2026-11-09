import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchGameEntries: vi.fn(),
  postLocalImport: vi.fn(),
  putGameEntry: vi.fn(),
}));

vi.mock("@/lib/api/entries-sync-client", () => api);

const ENTRIES_KEY = "isitcanon/entries/v1";
const IMPORT_KEY = "isitcanon/import/v1";

const SERVER_HL2 = {
  gameId: "hl2",
  status: "completed",
  shelf: null,
  device: null,
  storefront: null,
};

async function fresh() {
  vi.resetModules();
  const store = await import("@/utils/canon/entries-store");
  const sync = await import("@/utils/canon/entries-sync");
  return { ...store, ...sync };
}

function record(): Record<string, unknown> {
  const raw = localStorage.getItem(IMPORT_KEY);
  return raw === null ? {} : JSON.parse(raw);
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.useRealTimers();
  localStorage.setItem(ENTRIES_KEY, JSON.stringify({ hl1: { status: "playing" } }));
  api.fetchGameEntries.mockResolvedValue([SERVER_HL2]);
  api.postLocalImport.mockResolvedValue({ inserted: 1, skipped: 0 });
  api.putGameEntry.mockResolvedValue(200);
});

describe("entries-sync", () => {
  it("leaves everything alone signed out", async () => {
    const { leaveAccount, queuePush, getEntriesSnapshot } = await fresh();
    leaveAccount();
    queuePush("hl1");
    expect(getEntriesSnapshot()).toEqual({ hl1: { status: "playing" } });
    expect(api.putGameEntry).not.toHaveBeenCalled();
    expect(localStorage.getItem(IMPORT_KEY)).toBeNull();
  });

  it("asks before importing, and persists the decision per user", async () => {
    const { startSession, decideImport, leaveAccount } = await fresh();
    expect(await startSession("a")).toBe("prompt");
    expect(await decideImport("a", "never")).toBe(true);
    expect(api.postLocalImport).not.toHaveBeenCalled();
    expect(record().decisions).toEqual({ a: "never" });

    leaveAccount();
    expect(await startSession("b")).toBe("prompt");
    expect(await startSession("a")).toBe("synced");
  });

  it("records an import only after the server confirms it, keeping local marks", async () => {
    const { decideImport, getEntriesSnapshot } = await fresh();
    api.postLocalImport.mockResolvedValueOnce(null);
    expect(await decideImport("a", "imported")).toBe(false);
    expect(record().decisions).toBeUndefined();
    expect(getEntriesSnapshot()).toEqual({ hl1: { status: "playing" } });

    expect(await decideImport("a", "imported")).toBe(true);
    expect(api.postLocalImport).toHaveBeenLastCalledWith({ hl1: { status: "playing" } });
    expect(record().decisions).toEqual({ a: "imported" });
  });

  it("closes the question before the account pull finishes", async () => {
    const { decideImport } = await fresh();
    const pull = Promise.withResolvers<(typeof SERVER_HL2)[]>();
    api.fetchGameEntries.mockReturnValueOnce(pull.promise);
    const onDecided = vi.fn();
    const done = decideImport("a", "imported", onDecided);
    await vi.waitFor(() => expect(api.fetchGameEntries).toHaveBeenCalled());
    expect(onDecided).toHaveBeenCalledTimes(1);
    pull.resolve([SERVER_HL2]);
    expect(await done).toBe(true);
  });

  it("does not close the question when the import fails", async () => {
    const { decideImport } = await fresh();
    api.postLocalImport.mockResolvedValueOnce(null);
    const onDecided = vi.fn();
    expect(await decideImport("a", "imported", onDecided)).toBe(false);
    expect(onDecided).not.toHaveBeenCalled();
  });

  it("shows the account's marks signed in and puts the browser's back on sign-out", async () => {
    const { decideImport, leaveAccount, getEntriesSnapshot } = await fresh();
    await decideImport("a", "imported");
    expect(getEntriesSnapshot()).toEqual({ hl2: { status: "completed" } });

    leaveAccount();
    expect(getEntriesSnapshot()).toEqual({ hl1: { status: "playing" } });
    expect(JSON.parse(localStorage.getItem(ENTRIES_KEY) ?? "{}")).not.toHaveProperty("hl2");
  });

  it("keeps the cache when the account cannot be read", async () => {
    const { decideImport, getEntriesSnapshot, getSyncFailed } = await fresh();
    api.fetchGameEntries.mockResolvedValue(null);
    await decideImport("a", "never");
    expect(getEntriesSnapshot()).toEqual({ hl1: { status: "playing" } });
    expect(getSyncFailed()).toBe(true);
  });

  it("keeps an unconfirmed edit queued, shows it, and sends it on the next session", async () => {
    const sync = await fresh();
    await sync.decideImport("a", "never");
    vi.useFakeTimers();
    api.putGameEntry.mockResolvedValue(0);

    sync.setEntryField("hl2", "status", "dropped");
    sync.queuePush("hl2");
    await vi.runAllTimersAsync();
    expect(api.putGameEntry).toHaveBeenCalledWith("hl2", {
      status: "dropped",
      device: null,
      storefront: null,
    });
    expect(sync.getSyncFailed()).toBe(true);

    sync.leaveAccount();
    api.putGameEntry.mockResolvedValue(200);
    vi.useRealTimers();
    expect(await sync.startSession("a")).toBe("synced");
    expect(api.putGameEntry).toHaveBeenCalledTimes(2);
    expect(record().pending).toEqual({});
    expect(sync.getSyncFailed()).toBe(false);
  });

  it("lays queued edits over the account's marks when the send has not landed", async () => {
    const sync = await fresh();
    await sync.decideImport("a", "never");
    api.putGameEntry.mockResolvedValue(503);
    localStorage.setItem(
      IMPORT_KEY,
      JSON.stringify({
        ...record(),
        pending: { a: { hl2: { status: null }, hl3: { status: "own" } } },
      }),
    );
    await sync.startSession("a");
    expect(sync.getEntriesSnapshot()).toEqual({ hl3: { status: "own" } });
  });
});
