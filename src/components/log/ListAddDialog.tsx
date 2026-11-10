"use client";

import { useState } from "react";
import OptionSelect from "@/components/canon/OptionSelect";
import ListAddTabs, { addPanelId, addTabId } from "@/components/log/ListAddTabs";
import ListLibraryPicker from "@/components/log/ListLibraryPicker";
import ModalDialog from "@/components/log/ModalDialog";
import { LOG_CONTROL_CLASS, LOG_LABEL_CLASS, LOG_SECONDARY_CLASS } from "@/constants/log/classes";
import { KIND_NAMES } from "@/constants/log/copy";
import { KIND_TABS } from "@/constants/log/library";
import { LISTS_COPY } from "@/constants/log/lists-copy";
import { useMetadataSearch } from "@/hooks/log/use-metadata-search";
import type { ApiResult } from "@/types/api/api";
import type { ListAddMode, ListItem, ListItemCreate } from "@/types/log/list";
import type { MediaKind, SearchResult } from "@/types/metadata/metadata";
import { cn } from "@/utils/cn";
import { failureMessage } from "@/utils/log/failure-message";
import { listItemFromResult } from "@/utils/log/list-item-from-result";
import { isMediaKind } from "@/utils/log/media-kind";

const copy = LISTS_COPY.addDialog;

interface ListAddDialogProps {
  open: boolean;
  name: string;
  /** What the list holds now, so library titles already in it show as added. */
  existing: readonly ListItem[];
  onClose: () => void;
  onAdd: (item: ListItemCreate) => Promise<ApiResult<ListItem>>;
}

type SearchPaneProps = Pick<ListAddDialogProps, "onAdd">;

function describe(result: SearchResult): string {
  return [KIND_NAMES[result.type], result.year].filter(Boolean).join(" · ");
}

function SearchPane({ onAdd }: SearchPaneProps) {
  const [term, setTerm] = useState("");
  const [type, setType] = useState<MediaKind | "">("");
  const [adding, setAdding] = useState<SearchResult | null>(null);
  const [added, setAdded] = useState("");
  const [failure, setFailure] = useState("");
  const search = useMetadataSearch(term, type);
  const noResults =
    !search.loading && !search.idle && search.failure === null && search.results.length === 0;

  async function add(result: SearchResult) {
    setAdding(result);
    setAdded("");
    setFailure("");
    const created = await onAdd(listItemFromResult(result));
    setAdding(null);
    if (!created.ok) {
      setFailure(failureMessage(created.failure));
      return;
    }
    setAdded(copy.added.replace("{title}", result.title));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className={cn(LOG_LABEL_CLASS, "min-w-0 flex-1 basis-48")}>
          {copy.searchLabel}
          <input
            autoComplete="off"
            className={cn(LOG_CONTROL_CLASS, "w-full")}
            onChange={(event) => setTerm(event.target.value)}
            type="search"
            value={term}
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span aria-hidden="true" className="text-[12px] text-ink">
            {copy.typeLabel}
          </span>
          <OptionSelect
            label={copy.typeLabel}
            onChange={(value) => setType(isMediaKind(value) ? value : "")}
            options={KIND_TABS}
            placeholder={copy.anyType}
            selectClassName="h-11! sm:h-11! text-[13px]!"
            value={type}
          />
        </div>
      </div>
      <p className="text-[12px] text-muted">{copy.searchHint}</p>

      <div aria-live="polite" role="status">
        {search.loading && <p className="text-[13px] text-muted">{copy.searching}</p>}
        {adding !== null && (
          <p className="text-[13px] text-muted">{copy.adding.replace("{title}", adding.title)}</p>
        )}
        {added !== "" && <p className="text-[13px] text-ink">{added}</p>}
      </div>

      <div role="alert">
        {failure !== "" && <p className="text-[13px] text-danger">{failure}</p>}
        {search.failure !== null && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-[13px] text-danger">{failureMessage(search.failure)}</p>
            <button className={LOG_SECONDARY_CLASS} onClick={search.retry} type="button">
              {LISTS_COPY.retry}
            </button>
          </div>
        )}
      </div>

      {noResults && (
        <p className="text-[13px] text-muted">{copy.none.replace("{q}", `"${term.trim()}"`)}</p>
      )}

      {search.results.length > 0 && (
        <ul aria-label={copy.results} className="flex flex-col divide-y divide-line">
          {search.results.map((result) => (
            <li key={`${result.type}-${result.id}`}>
              <button
                className="flex min-h-11 w-full flex-col items-start justify-center rounded-control px-1 py-2 text-left transition-colors duration-[160ms] hover:bg-raise disabled:opacity-60 motion-reduce:transition-none"
                disabled={adding !== null}
                onClick={() => add(result)}
                type="button"
              >
                <span className="text-[13px] text-ink">{result.title}</span>
                <span className="text-[11px] text-muted">{describe(result)}</span>
                <span className="sr-only">{copy.pick.replace("{title}", result.title)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddBody({ existing, onAdd, onClose }: Omit<ListAddDialogProps, "open" | "name">) {
  const [mode, setMode] = useState<ListAddMode>("search");
  return (
    <div className="flex flex-col gap-4">
      <ListAddTabs onChange={setMode} value={mode} />
      <div aria-labelledby={addTabId(mode)} id={addPanelId(mode)} role="tabpanel">
        {mode === "search" ? (
          <SearchPane onAdd={onAdd} />
        ) : (
          <ListLibraryPicker existing={existing} onAdd={onAdd} />
        )}
      </div>
      <button className={LOG_SECONDARY_CLASS} onClick={onClose} type="button">
        {copy.close}
      </button>
    </div>
  );
}

/** Add to the list by searching every provider or by picking from your library; stays open. */
export default function ListAddDialog({
  open,
  name,
  existing,
  onClose,
  onAdd,
}: ListAddDialogProps) {
  return (
    <ModalDialog
      initialFocus="field"
      onClose={onClose}
      open={open}
      title={copy.title.replace("{name}", name)}
      variant="centre"
    >
      {open && <AddBody existing={existing} onAdd={onAdd} onClose={onClose} />}
    </ModalDialog>
  );
}
