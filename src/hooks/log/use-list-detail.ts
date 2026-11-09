"use client";

import { useCallback, useEffect, useState } from "react";

import {
  addListItem,
  deleteList,
  deleteListItem,
  fetchList,
  patchList,
  reorderListItems,
} from "@/lib/api/log-client";
import type { ApiFailure, ApiResult } from "@/types/api/api";
import type { ListItem, ListItemCreate, ListPatch, ListWithItems } from "@/types/log/list";
import { moveItem } from "@/utils/log/list-move";

interface Loaded {
  key: number;
  list: ListWithItems | null;
  failure: ApiFailure | null;
}

const withItems = (list: ListWithItems, items: readonly ListItem[]): ListWithItems => ({
  ...list,
  items: [...items],
  itemCount: items.length,
});

/** One list with its ordered items and every write against it. Writes wait for the server. */
export function useListDetail(id: string) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchList(id).then((result) => {
      if (cancelled) return;
      setLoaded(
        result.ok
          ? { key: attempt, list: result.data, failure: null }
          : { key: attempt, list: null, failure: result.failure },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const current = loaded?.key === attempt ? loaded : null;
  const list = current?.list ?? null;

  const change = useCallback((next: (list: ListWithItems) => ListWithItems) => {
    setLoaded((prev) =>
      prev === null || prev.list === null ? prev : { ...prev, list: next(prev.list) },
    );
  }, []);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  const rename = useCallback(
    async (patch: ListPatch) => {
      const result = await patchList(id, patch);
      if (result.ok) {
        const { name, description, kinds, updatedAt } = result.data;
        change((prev) => ({ ...prev, name, description, kinds, updatedAt }));
      }
      return result;
    },
    [id, change],
  );

  const add = useCallback(
    async (item: ListItemCreate): Promise<ApiResult<ListItem>> => {
      const result = await addListItem(id, item);
      if (result.ok) {
        const created = result.data;
        change((prev) => withItems(prev, [...prev.items, created]));
      }
      return result;
    },
    [id, change],
  );

  const remove = useCallback(
    async (item: ListItem): Promise<ApiResult<null>> => {
      setBusy(true);
      const result = await deleteListItem(id, item.id);
      setBusy(false);
      if (result.ok)
        change((prev) =>
          withItems(
            prev,
            prev.items.filter((x) => x.id !== item.id),
          ),
        );
      return result;
    },
    [id, change],
  );

  /** Swap with a neighbour: shown at once, put back if the order call fails. */
  const move = useCallback(
    async (index: number, delta: -1 | 1): Promise<ApiResult<null> | null> => {
      if (list === null) return null;
      const before = list.items;
      const after = moveItem(before, index, delta);
      if (after === before) return null;
      change((prev) => withItems(prev, after));
      setBusy(true);
      const result = await reorderListItems(
        id,
        after.map((item) => item.id),
      );
      setBusy(false);
      if (!result.ok) change((prev) => withItems(prev, before));
      return result;
    },
    [id, list, change],
  );

  const destroy = useCallback(() => deleteList(id), [id]);

  return {
    list,
    loading: current === null,
    failure: current?.failure ?? null,
    busy,
    reload,
    rename,
    add,
    remove,
    move,
    destroy,
  };
}
