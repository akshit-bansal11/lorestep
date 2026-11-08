"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth/auth-client";
import type { ImportDecision } from "@/types/canon/sync";
import {
  decideImport,
  getServerSyncFailed,
  getSyncFailed,
  leaveAccount,
  startSession,
  subscribeSync,
} from "@/utils/canon/entries-sync";

export interface UseEntriesSync {
  /** The import question is open for the signed-in user. */
  prompt: boolean;
  /** An edit or the import has not reached the account. */
  failed: boolean;
  busy: boolean;
  decide: (decision: ImportDecision) => void;
  /** "Not now": hide the question for this page load only. */
  dismiss: () => void;
}

/** Follows the session: sign-in starts account sync (or asks to import), sign-out leaves it. */
export function useEntriesSync(): UseEntriesSync {
  const { data, isPending } = authClient.useSession();
  const userId = data?.user.id ?? null;
  const [prompt, setPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const failed = useSyncExternalStore(subscribeSync, getSyncFailed, getServerSyncFailed);

  useEffect(() => {
    if (isPending) return;
    if (userId === null) {
      leaveAccount();
      setPrompt(false);
      return;
    }
    let cancelled = false;
    void startSession(userId).then((result) => {
      if (!cancelled) setPrompt(result === "prompt");
    });
    return () => {
      cancelled = true;
    };
  }, [userId, isPending]);

  const decide = useCallback(
    (decision: ImportDecision) => {
      if (userId === null) return;
      setBusy(true);
      void decideImport(userId, decision).then((done) => {
        setBusy(false);
        if (done) setPrompt(false);
      });
    },
    [userId],
  );

  const dismiss = useCallback(() => setPrompt(false), []);

  return { prompt, failed, busy, decide, dismiss };
}
