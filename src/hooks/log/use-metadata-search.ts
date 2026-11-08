"use client";

import { useCallback, useEffect, useState } from "react";

import { SEARCH_DEBOUNCE_MS } from "@/constants/log/library";
import { searchMedia } from "@/lib/api/log-client";
import type { ApiFailure } from "@/types/api/api";
import type { MediaKind, SearchResult } from "@/types/metadata/metadata";

interface Answer {
  key: string;
  results: SearchResult[];
  failure: ApiFailure | null;
}

export interface MetadataSearch {
  /** No term yet, so there is nothing to show but the hint. */
  idle: boolean;
  loading: boolean;
  results: SearchResult[];
  failure: ApiFailure | null;
  retry: () => void;
}

/** Type-to-search over `/api/v1/search`: debounced, one answer kept per term, stale ones dropped. */
export function useMetadataSearch(term: string, type: MediaKind | ""): MetadataSearch {
  const [debounced, setDebounced] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const trimmed = term.trim();
  const key = `${debounced}|${type}|${attempt}`;

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  useEffect(() => {
    if (debounced === "") return;
    let cancelled = false;
    searchMedia(debounced, type).then((result) => {
      if (cancelled) return;
      setAnswer(
        result.ok
          ? { key, results: result.data, failure: null }
          : { key, results: [], failure: result.failure },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [debounced, type, key]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const current = answer?.key === key && trimmed === debounced ? answer : null;

  return {
    idle: trimmed === "",
    loading: trimmed !== "" && current === null,
    results: current?.results ?? [],
    failure: current?.failure ?? null,
    retry,
  };
}
