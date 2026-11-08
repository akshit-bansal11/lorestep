"use client";

import { useCallback, useState } from "react";
import OptionSelect from "@/components/canon/OptionSelect";
import EntryEditor from "@/components/log/EntryEditor";
import KindTabs from "@/components/log/KindTabs";
import LibraryTable from "@/components/log/LibraryTable";
import NoticeBar from "@/components/log/NoticeBar";
import SearchAddDialog from "@/components/log/SearchAddDialog";
import StatusSelect from "@/components/log/StatusSelect";
import { PAGE_CLASS, PAGE_TITLE_CLASS } from "@/constants/canon/ui";
import { LOG_CONTROL_CLASS, LOG_PRIMARY_CLASS } from "@/constants/log/classes";
import { KIND_NAMES, LIBRARY_COPY } from "@/constants/log/copy";
import { SORT_CHOICES, SORT_DEFAULT_LABEL, UNDO_WINDOW_SEC } from "@/constants/log/library";
import { CANONICAL_STATUSES } from "@/constants/log/statuses";
import { useLibrary } from "@/hooks/log/use-library";
import { useOnline } from "@/hooks/log/use-online";
import type { Entry } from "@/types/log/entry";
import type { LocalPatch, Notice } from "@/types/log/library";
import { cn } from "@/utils/cn";
import { failureMessage } from "@/utils/log/failure-message";
import { isMediaKind } from "@/utils/log/media-kind";
import { pick } from "@/utils/log/pick";

const copy = LIBRARY_COPY;
const SORT_IDS = SORT_CHOICES.map((option) => option.id);

/** The signed-in media log: filters, the list, the editor drawer and the add dialog. */
export default function LibraryApp() {
  const library = useLibrary();
  const online = useOnline();
  const [editing, setEditing] = useState<Entry | null>(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const { filters, create, update, remove, restore, setKind, setStatus, setSearch } = library;

  const dismiss = useCallback(() => setNotice(null), []);
  const closeEditor = useCallback(() => setEditing(null), []);
  const closeAdd = useCallback(() => setAdding(false), []);

  async function undoDelete(entry: Entry) {
    const result = await restore(entry);
    setNotice(
      result.ok
        ? { text: copy.remove.restored.replace("{title}", entry.title) }
        : { text: failureMessage(result.failure), onUndo: () => undoDelete(entry) },
    );
  }

  async function save(entry: Entry, patch: LocalPatch) {
    const result = await update(entry, patch);
    if (result.ok) setNotice({ text: copy.editor.saved.replace("{title}", entry.title) });
    return result;
  }

  async function deleteEntry(entry: Entry) {
    setEditing(null);
    const result = await remove(entry);
    setNotice(
      result.ok
        ? {
            text: copy.remove.done
              .replace("{title}", entry.title)
              .replace("{sec}", String(UNDO_WINDOW_SEC)),
            onUndo: () => undoDelete(entry),
          }
        : { text: failureMessage(result.failure) },
    );
  }

  function added(entry: Entry, partial: boolean) {
    setAdding(false);
    setStatus("");
    setSearch("");
    const kind = isMediaKind(entry.kind) ? entry.kind : filters.kind;
    setKind(kind);
    const template = partial ? copy.addDialog.partial : copy.addDialog.added;
    const text = template.replace("{title}", entry.title).replace("{kind}", KIND_NAMES[kind]);
    setNotice({ text });
  }

  function clearFilters() {
    setStatus("");
    setSearch("");
  }

  return (
    <main className={cn(PAGE_CLASS, "flex flex-1 flex-col gap-4 py-8 lg:py-10")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={PAGE_TITLE_CLASS}>{copy.title}</h1>
        <button className={LOG_PRIMARY_CLASS} onClick={() => setAdding(true)} type="button">
          {copy.add}
        </button>
      </div>

      <KindTabs onChange={setKind} value={filters.kind} />

      <div className="flex flex-wrap items-center gap-2">
        <label className="min-w-0 flex-1 basis-48">
          <span className="sr-only">{copy.searchLabel}</span>
          <input
            autoComplete="off"
            className={cn(LOG_CONTROL_CLASS, "w-full")}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.searchPlaceholder}
            type="search"
            value={library.search}
          />
        </label>
        <StatusSelect
          kind={filters.kind}
          label={copy.statusFilter}
          onChange={(value) => setStatus(pick(CANONICAL_STATUSES, value) ?? "")}
          placeholder={copy.allStatuses}
          value={filters.status}
        />
        <OptionSelect
          label={copy.sortLabel}
          onChange={(value) => library.setSort(pick(SORT_IDS, value) ?? "updated")}
          options={SORT_CHOICES}
          placeholder={SORT_DEFAULT_LABEL}
          selectClassName="h-11! sm:h-11! text-[13px]!"
          value={library.sort === "updated" ? "" : library.sort}
        />
      </div>

      <div aria-live="polite" role="status">
        {!online && (
          <p className="rounded-card border border-accent-line bg-accent-soft px-4 py-2 text-[13px] text-ink">
            {copy.offline.banner}
          </p>
        )}
      </div>

      <NoticeBar notice={notice} onDismiss={dismiss} />

      <LibraryTable
        failure={library.failure}
        filtered={filters.status !== "" || filters.q !== ""}
        hasMore={library.hasMore}
        items={library.items}
        kind={filters.kind}
        loading={library.loading}
        loadingMore={library.more.loading}
        moreFailure={library.more.failure}
        onAdd={() => setAdding(true)}
        onClearFilters={clearFilters}
        onLoadMore={library.loadMore}
        onOpen={setEditing}
        onRetry={library.reload}
      />

      <EntryEditor entry={editing} onClose={closeEditor} onDelete={deleteEntry} onSave={save} />
      <SearchAddDialog
        defaultKind={filters.kind}
        onAdded={added}
        onClose={closeAdd}
        onCreate={create}
        open={adding}
      />
    </main>
  );
}
