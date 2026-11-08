"use client";

import { LOG_CONTROL_CLASS, LOG_LABEL_CLASS } from "@/constants/log/classes";
import { LIBRARY_COPY } from "@/constants/log/copy";
import { PROGRESS_FIELDS } from "@/constants/log/library";
import type { DraftErrors, DraftField, EntryDraft } from "@/types/log/library";
import type { MediaKind } from "@/types/metadata/metadata";
import { cn } from "@/utils/cn";

interface ProgressFieldsProps {
  kind: MediaKind;
  draft: EntryDraft;
  errors: DraftErrors;
  onChange: (field: DraftField, value: string) => void;
}

/** The counters a kind tracks (season and episode, chapter and volume, play time). Movies have none. */
export default function ProgressFields({ kind, draft, errors, onChange }: ProgressFieldsProps) {
  const fields = PROGRESS_FIELDS[kind];
  if (fields.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-[12px] text-ink">{LIBRARY_COPY.editor.progress}</legend>
      <div className="flex flex-wrap gap-3">
        {fields.map((field) => {
          const error = errors[field.key];
          return (
            <div className="flex flex-col gap-1.5" key={field.key}>
              <label className={LOG_LABEL_CLASS}>
                {field.label}
                <input
                  aria-describedby={error === undefined ? undefined : `${field.key}-error`}
                  aria-invalid={error === undefined ? undefined : true}
                  className={cn(LOG_CONTROL_CLASS, "w-28", error !== undefined && "border-accent")}
                  inputMode="numeric"
                  min={0}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  type="number"
                  value={draft[field.key]}
                />
              </label>
              {error !== undefined && (
                <p className="max-w-40 text-[12px] text-accent" id={`${field.key}-error`}>
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
