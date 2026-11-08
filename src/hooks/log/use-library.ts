"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DEFAULT_KIND, SEARCH_DEBOUNCE_MS } from "@/constants/log/library";
import {
  createEntry,
  deleteEntry,
  fetchEntries,
  patchEntry,
  restoreEntry,
} from "@/lib/api/log-client";
import type { ApiFailure, ApiResult } from "@/types/api/api";
import type { Entry } from "@/types/log/entry";
import type { EntryCreateInput } from "@/types/log/entry-input";
import type { LibraryFilters, LocalPatch, SortKey } from "@/types/log/library";
import type { MediaKind } from "@/types/metadata/metadata";
import {
  applyLocalPatch,
  insertEntry,
  matchesFilters,
  removeEntry,
  replaceEntry,
  sortEntries,
} from "@/utils/log/entry-list";

/** One answered load. `key` ties it to the filters it answered, so a stale one never shows. */
interface Loaded {
  key: string;
  items: Entry[];
  nextCursor: string | null;
  failure: ApiFailure | null;
}

interface MoreState {
  loading: boolean;
  failure: ApiFailure | null;
}

const hasId = (items: readonly Entry[], id: string) => items.some((entry) => entry.id === id);

function mapItems(loaded: Loaded | null, change: (items: Entry[]) => Entry[]): Loaded | null {
  return loaded === null ? null : { ...loaded, items: change(loaded.items) };
}

/**
 * The signed-in library: the filtered, paged list and every write against it. Writes are
 * optimistic: the list changes first and is reconciled with the server's copy, or rolled back to
 * the previous copy with the failure returned for the caller to show.
 */
export function useLibrary() {
  const [kind, setKind] = useState<MediaKind>(DEFAULT_KIND);
  const [status, setStatus] = useState<LibraryFilters["status"]>("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [more, setMore] = useState<MoreState>({ loading: false, failure: null });

  const filters = useMemo<LibraryFilters>(() => ({ kind, status, q }), [kind, status, q]);
  const key = `${kind}|${status}|${q}|${attempt}`;

  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    fetchEntries(filters).then((result) => {
      if (cancelled) return;
      setMore({ loading: false, failure: null });
      setLoaded(
        result.ok
          ? { key, items: result.data.items, nextCursor: result.data.nextCursor, failure: null }
          : { key, items: [], nextCursor: null, failure: result.failure },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [filters, key]);

  const current = loaded?.key === key ? loaded : null;
  const items = useMemo(() => sortEntries(current?.items ?? [], sort), [current, sort]);

  const loadMore = useCallback(async () => {
    if (current === null || current.nextCursor === null) return;
    setMore({ loading: true, failure: null });
    const result = await fetchEntries(filters, current.nextCursor);
    setMore({ loading: false, failure: result.ok ? null : result.failure });
    if (!result.ok) return;
    const { items: page, nextCursor } = result.data;
    setLoaded((prev) =>
      prev?.key !== key
        ? prev
        : {
            ...prev,
            items: [...prev.items, ...page.filter((entry) => !hasId(prev.items, entry.id))],
            nextCursor,
          },
    );
  }, [current, filters, key]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  const create = useCallback(
    async (input: EntryCreateInput): Promise<ApiResult<Entry>> => {
      const result = await createEntry(input);
      if (result.ok && matchesFilters(result.data, filters)) {
        const created = result.data;
        setLoaded((prev) => mapItems(prev, (list) => insertEntry(list, created)));
      }
      return result;
    },
    [filters],
  );

  const update = useCallback(async (entry: Entry, patch: LocalPatch): Promise<ApiResult<Entry>> => {
    const optimistic = applyLocalPatch(entry, patch);
    setLoaded((prev) => mapItems(prev, (list) => replaceEntry(list, optimistic)));
    const result = await patchEntry(entry.id, patch);
    const settled = result.ok ? result.data : entry;
    setLoaded((prev) => mapItems(prev, (list) => replaceEntry(list, settled)));
    return result;
  }, []);

  const remove = useCallback(async (entry: Entry): Promise<ApiResult<null>> => {
    setLoaded((prev) => mapItems(prev, (list) => removeEntry(list, entry.id)));
    const result = await deleteEntry(entry.id);
    if (!result.ok) setLoaded((prev) => mapItems(prev, (list) => insertEntry(list, entry)));
    return result;
  }, []);

  const restore = useCallback(
    async (entry: Entry): Promise<ApiResult<Entry>> => {
      const result = await restoreEntry(entry.id);
      if (result.ok && matchesFilters(result.data, filters)) {
        const restored = result.data;
        setLoaded((prev) => mapItems(prev, (list) => insertEntry(list, restored)));
      }
      return result;
    },
    [filters],
  );

  return {
    filters,
    search,
    sort,
    items,
    loading: current === null,
    failure: current?.failure ?? null,
    hasMore: (current?.nextCursor ?? null) !== null,
    more,
    setKind,
    setStatus,
    setSearch,
    setSort,
    loadMore,
    reload,
    create,
    update,
    remove,
    restore,
  };
}

export type UseLibrary = ReturnType<typeof useLibrary>;
