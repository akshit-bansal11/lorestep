"use client";

import { useState } from "react";
import OptionSelect from "@/components/canon/OptionSelect";
import ModalDialog from "@/components/log/ModalDialog";
import { LOG_CONTROL_CLASS, LOG_LABEL_CLASS, LOG_SECONDARY_CLASS } from "@/constants/log/classes";
import { KIND_NAMES, LIBRARY_COPY } from "@/constants/log/copy";
import { KIND_TABS } from "@/constants/log/library";
import { useMetadataSearch } from "@/hooks/log/use-metadata-search";
import { fetchMetadata } from "@/lib/api/log-client";
import type { ApiResult } from "@/types/api/api";
import type { Entry } from "@/types/log/entry";
import type { EntryCreateInput } from "@/types/log/entry-input";
import type { MediaKind, SearchResult } from "@/types/metadata/metadata";
import { cn } from "@/utils/cn";
import { entryFromResult } from "@/utils/log/entry-from-result";
import { failureMessage } from "@/utils/log/failure-message";
import { isMediaKind } from "@/utils/log/media-kind";

const copy = LIBRARY_COPY.addDialog;

interface SearchAddDialogProps {
  open: boolean;
  /** The library's current tab, offered as the starting type filter. */
  defaultKind: MediaKind;
  onClose: () => void;
  onCreate: (input: EntryCreateInput) => Promise<ApiResult<Entry>>;
  /** Fired after the server stored the entry; `partial` when metadata could not fill every field. */
  onAdded: (entry: Entry, partial: boolean) => void;
}

interface AddFormProps {
  defaultKind: MediaKind;
  onCreate: SearchAddDialogProps["onCreate"];
  onAdded: SearchAddDialogProps["onAdded"];
  onClose: () => void;
}

function describe(result: SearchResult): string {
  return [KIND_NAMES[result.type], result.year].filter(Boolean).join(" · ");
}

function AddForm({ defaultKind, onCreate, onAdded, onClose }: AddFormProps) {
  const [term, setTerm] = useState("");
  const [type, setType] = useState<MediaKind | "">(defaultKind);
  const [adding, setAdding] = useState<SearchResult | null>(null);
  const [failure, setFailure] = useState("");
  const search = useMetadataSearch(term, type);
  const noResults =
    !search.loading && !search.idle && search.failure === null && search.results.length === 0;

  async function add(result: SearchResult) {
    setAdding(result);
    setFailure("");
    // A metadata miss never blocks the add: the title, year and id from the search are enough.
    const metadata = await fetchMetadata(result);
    const filled = metadata.ok ? metadata.data : null;
    const created = await onCreate(entryFromResult(result, filled));
    setAdding(null);
    if (!created.ok) {
      setFailure(failureMessage(created.failure));
      return;
    }
    onAdded(created.data, filled === null || (filled.missingFields ?? []).length > 0);
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
          <p className="text-[13px] text-muted">
            {copy.prefilling.replace("{title}", adding.title)}
          </p>
        )}
      </div>

      <div role="alert">
        {failure !== "" && <p className="text-[13px] text-danger">{failure}</p>}
        {search.failure !== null && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-[13px] text-danger">{failureMessage(search.failure)}</p>
            <button className={LOG_SECONDARY_CLASS} onClick={search.retry} type="button">
              {LIBRARY_COPY.retry}
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

      <button className={LOG_SECONDARY_CLASS} onClick={onClose} type="button">
        {copy.close}
      </button>
    </div>
  );
}

/** Type to search every provider, pick a result, and the metadata call fills the new entry. */
export default function SearchAddDialog({
  open,
  defaultKind,
  onClose,
  onCreate,
  onAdded,
}: SearchAddDialogProps) {
  return (
    <ModalDialog
      initialFocus="field"
      onClose={onClose}
      open={open}
      title={copy.title}
      variant="centre"
    >
      {open && (
        <AddForm
          defaultKind={defaultKind}
          onAdded={onAdded}
          onClose={onClose}
          onCreate={onCreate}
        />
      )}
    </ModalDialog>
  );
}
