"use client";

import { useSyncExternalStore } from "react";
import type { UserEntries, UserField } from "@/types/canon/user";
import {
  clearAllEntries,
  getEntriesSnapshot,
  getServerEntriesSnapshot,
  setEntryField,
  subscribeEntries,
} from "@/utils/canon/entries-store";
import { queuePush } from "@/utils/canon/entries-sync";

export interface UseEntries {
  entries: UserEntries;
  setField: (gameId: string, field: UserField, value: string) => void;
  clearEntries: () => void;
}

/** Writes land in the local cache first; signed in, `queuePush` also sends them to the account. */
function setField(gameId: string, field: UserField, value: string): void {
  setEntryField(gameId, field, value);
  queuePush(gameId);
}

export function useEntries(): UseEntries {
  const entries = useSyncExternalStore(
    subscribeEntries,
    getEntriesSnapshot,
    getServerEntriesSnapshot,
  );

  return { entries, setField, clearEntries: clearAllEntries };
}
