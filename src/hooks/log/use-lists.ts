"use client";

import { useCallback, useEffect, useState } from "react";

import { createList, fetchLists } from "@/lib/api/log-client";
import type { ApiFailure, ApiResult } from "@/types/api/api";
import type { List, ListCreate } from "@/types/log/list";

/** One answered load; `key` ties it to the attempt it answered, so a stale one never shows. */
interface Loaded {
  key: number;
  lists: List[];
  failure: ApiFailure | null;
}

/** The caller's lists, loaded once per attempt, plus create. */
export function useLists() {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLists().then((result) => {
      if (cancelled) return;
      setLoaded(
        result.ok
          ? { key: attempt, lists: result.data, failure: null }
          : { key: attempt, lists: [], failure: result.failure },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const current = loaded?.key === attempt ? loaded : null;

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  const create = useCallback(async (input: ListCreate): Promise<ApiResult<List>> => {
    const result = await createList(input);
    if (result.ok) {
      const created = result.data;
      setLoaded((prev) => (prev === null ? prev : { ...prev, lists: [created, ...prev.lists] }));
    }
    return result;
  }, []);

  return {
    lists: current?.lists ?? [],
    loading: current === null,
    failure: current?.failure ?? null,
    reload,
    create,
  };
}
