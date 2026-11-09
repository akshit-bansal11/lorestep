import { IMPORT_STORAGE_KEY } from "@/constants/canon/storage";
import { SYNC_DEBOUNCE_MS } from "@/constants/canon/sync";
import { fetchGameEntries, postLocalImport, putGameEntry } from "@/lib/api/entries-sync-client";
import { toUserEntries } from "@/mappers/canon/user-entry-mapper";
import { syncRecordSchema } from "@/schemas/canon/sync";
import type { ImportDecision, SessionStart, SyncRecord } from "@/types/canon/sync";
import type { GameEntryInput } from "@/types/log/entry";
import {
  getEntriesSnapshot,
  replaceAllEntries,
  sanitiseEntries,
} from "@/utils/canon/entries-store";

/*
 * Signed-in tracker sync (PLAN.md M7). Signed out, nothing here touches the entries cache. Signed in
 * after an import decision, the cache holds the account's marks and the browser's own marks wait in
 * the record's `anon` until sign-out puts them back, so a shared machine never shows one account's
 * marks to the next person and the browser's marks are never deleted. Each edit is queued in
 * `pending` before it is sent and leaves only once the server answers 2xx (or 404: the game is not
 * in the catalog, so it can never apply); anything else keeps it for the next session start.
 */

const freshRecord = (): SyncRecord => ({ decisions: {}, owner: null, anon: {}, pending: {} });
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();
let failed = false;

function readRecord(): SyncRecord {
  try {
    const raw = localStorage.getItem(IMPORT_STORAGE_KEY);
    if (raw === null) return freshRecord();
    const parsed = syncRecordSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : freshRecord();
  } catch (error) {
    console.warn("sync record read failed", error);
    return freshRecord();
  }
}

function updateRecord(change: (record: SyncRecord) => void): SyncRecord {
  const record = readRecord();
  change(record);
  try {
    localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(record));
  } catch (error) {
    console.warn("sync record write failed", error);
  }
  return record;
}

function setFailed(next: boolean): void {
  if (failed === next) return;
  failed = next;
  for (const listener of listeners) listener();
}

export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True while an edit or the import has not reached the account ("Not synced"). */
export function getSyncFailed(): boolean {
  return failed;
}

export function getServerSyncFailed(): boolean {
  return false;
}

/** Sends one queued edit; true when it is settled (confirmed, or can never apply). */
async function flushOne(userId: string, gameId: string): Promise<boolean> {
  const mark = readRecord().pending[userId]?.[gameId];
  if (mark === undefined) return true;
  const status = await putGameEntry(gameId, mark);
  if (!(status >= 200 && status < 300) && status !== 404) return false;
  updateRecord((record) => {
    const queue = record.pending[userId];
    // An edit made while this one was in flight stays queued for its own send.
    if (queue !== undefined && JSON.stringify(queue[gameId]) === JSON.stringify(mark)) {
      delete queue[gameId];
      if (Object.keys(queue).length === 0) delete record.pending[userId];
    }
  });
  return true;
}

async function flushAll(userId: string): Promise<boolean> {
  let settled = true;
  for (const gameId of Object.keys(readRecord().pending[userId] ?? {})) {
    if (!(await flushOne(userId, gameId))) settled = false;
  }
  return settled;
}

/** The account's marks replace the cache (server wins), with unconfirmed edits laid on top. */
async function pull(userId: string): Promise<boolean> {
  const items = await fetchGameEntries();
  const record = readRecord();
  if (items === null || record.owner !== userId) return false;
  const queued = record.pending[userId] ?? {};
  const next = { ...toUserEntries(items), ...sanitiseEntries(queued) };
  for (const [gameId, mark] of Object.entries(queued)) {
    if (mark.status === null) delete next[gameId];
  }
  replaceAllEntries(next);
  return true;
}

function hasPending(userId: string): boolean {
  return Object.keys(readRecord().pending[userId] ?? {}).length > 0;
}

/**
 * Puts the browser's own marks back and forgets the account's. Safe to call signed out at any
 * time: with no account in the cache it does nothing.
 */
export function leaveAccount(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  const before = readRecord();
  if (before.owner === null) return;
  updateRecord((record) => {
    record.owner = null;
    record.anon = {};
  });
  replaceAllEntries(before.anon);
  setFailed(false);
}

/**
 * Called once the session names a user. "prompt" when the browser holds marks and this user has
 * not decided about importing them; otherwise the cache switches to the account's marks.
 */
export async function startSession(userId: string): Promise<SessionStart> {
  const record = readRecord();
  if (record.owner !== null && record.owner !== userId) leaveAccount();
  if (record.owner !== userId) {
    const hasLocal = Object.keys(getEntriesSnapshot()).length > 0;
    if (record.decisions[userId] === undefined && hasLocal) return "prompt";
    updateRecord((next) => {
      next.owner = userId;
      next.anon = getEntriesSnapshot();
    });
  }
  const flushed = await flushAll(userId);
  const pulled = await pull(userId);
  setFailed(!(flushed && pulled));
  return "synced";
}

/**
 * Records the answer; "imported" only after the server confirmed the copy. False on failure.
 * `onDecided` runs the moment the answer is stored, before the (slow) account sync, so the caller
 * can close the question without waiting for the pull.
 */
export async function decideImport(
  userId: string,
  decision: ImportDecision,
  onDecided?: () => void,
): Promise<boolean> {
  if (decision === "imported" && (await postLocalImport(getEntriesSnapshot())) === null) {
    setFailed(true);
    return false;
  }
  updateRecord((record) => {
    record.decisions[userId] = decision;
  });
  onDecided?.();
  await startSession(userId);
  return true;
}

/** After a local edit: queue the game's marks for the account, sent once edits pause. */
export function queuePush(gameId: string): void {
  const owner = readRecord().owner;
  if (owner === null) return;
  const entry = getEntriesSnapshot()[gameId];
  const mark: GameEntryInput = {
    status: entry?.status ?? null,
    device: entry?.device ?? null,
    storefront: entry?.storefront ?? null,
  };
  updateRecord((record) => {
    record.pending[owner] = { ...record.pending[owner], [gameId]: mark };
  });
  clearTimeout(timers.get(gameId));
  timers.set(
    gameId,
    setTimeout(() => {
      timers.delete(gameId);
      void flushOne(owner, gameId).then((settled) => {
        if (!settled) setFailed(true);
        else if (!hasPending(owner)) setFailed(false);
      });
    }, SYNC_DEBOUNCE_MS),
  );
}
