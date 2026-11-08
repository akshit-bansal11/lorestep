import { PAGE_SIZE } from "@/constants/log/library";
import type { LibraryFilters } from "@/types/log/library";

/** Query string of GET /api/v1/entries for the current filters. */
export function buildEntriesQuery(filters: LibraryFilters, cursor?: string): string {
  const params = new URLSearchParams({ kind: filters.kind, limit: String(PAGE_SIZE) });
  if (filters.status !== "") params.set("status", filters.status);
  if (filters.q !== "") params.set("q", filters.q);
  if (cursor !== undefined) params.set("cursor", cursor);
  return params.toString();
}
