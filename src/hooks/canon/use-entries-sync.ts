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
  const [promptFor, setPromptFor] = useState<string | null>(null);
  const prompt = userId !== null && promptFor === userId;
  const [busy, setBusy] = useState(false);
  const failed = useSyncExternalStore(subscribeSync, getSyncFailed, getServerSyncFailed);

  useEffect(() => {
    if (isPending) return;
    if (userId === null) {
      leaveAccount();
      return;
    }
    let cancelled = false;
    void startSession(userId).then((result) => {
      if (!cancelled) setPromptFor(result === "prompt" ? userId : null);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, isPending]);

  const decide = useCallback(
    (decision: ImportDecision) => {
      if (userId === null) return;
      setBusy(true);
      void decideImport(userId, decision, () => setPromptFor(null)).then(() => setBusy(false));
    },
    [userId],
  );

  const dismiss = useCallback(() => setPromptFor(null), []);

  return { prompt, failed, busy, decide, dismiss };
}
