import { z } from "zod";

import { apiRequest, apiSend } from "@/lib/api/api-request";
import {
  entryPageResponseSchema,
  entryResponseSchema,
  searchResultsResponseSchema,
} from "@/schemas/log/entry-response";
import {
  listItemResponseSchema,
  listResponseSchema,
  listWithItemsResponseSchema,
} from "@/schemas/log/list-response";
import { metadataResponseSchema } from "@/schemas/log/metadata-response";
import type { ApiResult } from "@/types/api/api";
import type { Entry, EntryPage } from "@/types/log/entry";
import type { EntryCreateInput, EntryPatchInput } from "@/types/log/entry-input";
import type { LibraryFilters } from "@/types/log/library";
import type {
  List,
  ListCreate,
  ListItem,
  ListItemCreate,
  ListPatch,
  ListWithItems,
} from "@/types/log/list";
import type { MetadataResponse } from "@/types/log/metadata-response";
import type { MediaKind, SearchResult } from "@/types/metadata/metadata";
import { buildEntriesQuery } from "@/utils/log/entries-query";

const entryEnvelope = z.object({ data: entryResponseSchema });
const pageEnvelope = z.object({ data: entryPageResponseSchema });
const searchEnvelope = z.object({ data: searchResultsResponseSchema });

async function unwrap<T>(result: Promise<ApiResult<{ data: T }>>): Promise<ApiResult<T>> {
  const settled = await result;
  return settled.ok ? { ok: true, data: settled.data.data } : settled;
}

/** One page of the caller's library. */
export function fetchEntries(
  filters: LibraryFilters,
  cursor?: string,
): Promise<ApiResult<EntryPage>> {
  return unwrap(apiRequest(`/api/v1/entries?${buildEntriesQuery(filters, cursor)}`, pageEnvelope));
}

export function createEntry(input: EntryCreateInput): Promise<ApiResult<Entry>> {
  return unwrap(apiRequest("/api/v1/entries", entryEnvelope, { method: "POST", json: input }));
}

export function patchEntry(id: string, patch: EntryPatchInput): Promise<ApiResult<Entry>> {
  return unwrap(
    apiRequest(`/api/v1/entries/${encodeURIComponent(id)}`, entryEnvelope, {
      method: "PATCH",
      json: patch,
    }),
  );
}

export function deleteEntry(id: string): Promise<ApiResult<null>> {
  return apiSend(`/api/v1/entries/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function searchMedia(q: string, type: MediaKind | ""): Promise<ApiResult<SearchResult[]>> {
  const params = new URLSearchParams({ q });
  if (type !== "") params.set("type", type);
  return unwrap(apiRequest(`/api/v1/search?${params.toString()}`, searchEnvelope));
}

export function fetchMetadata(result: SearchResult): Promise<ApiResult<MetadataResponse>> {
  const params = new URLSearchParams({ type: result.type, id: result.id, title: result.title });
  if (/^\d{4}$/.test(result.year)) params.set("year", result.year);
  return apiRequest(`/api/v1/metadata?${params.toString()}`, metadataResponseSchema);
}

/** Undo a delete: the same entry, with its id, links and list memberships, comes back. */
export function restoreEntry(id: string): Promise<ApiResult<Entry>> {
  return unwrap(
    apiRequest(`/api/v1/entries/${encodeURIComponent(id)}/restore`, entryEnvelope, {
      method: "POST",
    }),
  );
}

const listsEnvelope = z.object({ data: z.array(listResponseSchema) });
const listEnvelope = z.object({ data: listResponseSchema });
const listDetailEnvelope = z.object({ data: listWithItemsResponseSchema });
const listItemEnvelope = z.object({ data: listItemResponseSchema });

const listPath = (id: string) => `/api/v1/lists/${encodeURIComponent(id)}`;

export function fetchLists(): Promise<ApiResult<List[]>> {
  return unwrap(apiRequest("/api/v1/lists", listsEnvelope));
}

export function createList(input: ListCreate): Promise<ApiResult<List>> {
  return unwrap(apiRequest("/api/v1/lists", listEnvelope, { method: "POST", json: input }));
}

export function fetchList(id: string): Promise<ApiResult<ListWithItems>> {
  return unwrap(apiRequest(listPath(id), listDetailEnvelope));
}

export function patchList(id: string, patch: ListPatch): Promise<ApiResult<List>> {
  return unwrap(apiRequest(listPath(id), listEnvelope, { method: "PATCH", json: patch }));
}

export function deleteList(id: string): Promise<ApiResult<null>> {
  return apiSend(listPath(id), { method: "DELETE" });
}

export function addListItem(id: string, item: ListItemCreate): Promise<ApiResult<ListItem>> {
  return unwrap(
    apiRequest(`${listPath(id)}/items`, listItemEnvelope, { method: "POST", json: item }),
  );
}

export function deleteListItem(id: string, itemId: string): Promise<ApiResult<null>> {
  return apiSend(`${listPath(id)}/items/${encodeURIComponent(itemId)}`, { method: "DELETE" });
}

/** The full new order: the ids must be exactly the list's items (400 `invalid_order` otherwise). */
export function reorderListItems(id: string, ids: readonly string[]): Promise<ApiResult<null>> {
  return apiSend(`${listPath(id)}/items/order`, { method: "PUT", json: { ids } });
}
