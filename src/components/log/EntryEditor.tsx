"use client";

import { type FormEvent, useState } from "react";
import OptionSelect from "@/components/canon/OptionSelect";
import ModalDialog from "@/components/log/ModalDialog";
import ProgressFields from "@/components/log/ProgressFields";
import RatingInput from "@/components/log/RatingInput";
import SelectField from "@/components/log/SelectField";
import StatusSelect from "@/components/log/StatusSelect";
import { DEVICES } from "@/constants/canon/devices";
import { STOREFRONTS } from "@/constants/canon/storefronts";
import {
  LOG_DANGER_CLASS,
  LOG_LABEL_CLASS,
  LOG_PRIMARY_CLASS,
  LOG_SECONDARY_CLASS,
  LOG_TEXTAREA_CLASS,
} from "@/constants/log/classes";
import { LIBRARY_COPY } from "@/constants/log/copy";
import { ENTRY_LIMITS } from "@/constants/log/entries";
import { SHELF_OPTIONS } from "@/constants/log/library";
import type { ApiResult } from "@/types/api/api";
import type { Entry } from "@/types/log/entry";
import type { DraftErrors, DraftField, EntryDraft, LocalPatch } from "@/types/log/library";
import { draftFromEntry, patchFromDraft, validateDraft } from "@/utils/log/entry-draft";
import { failureMessage } from "@/utils/log/failure-message";
import { isMediaKind } from "@/utils/log/media-kind";

const SELECT_HEIGHT = "h-11! sm:h-11! text-[13px]!";
const copy = LIBRARY_COPY.editor;

interface EntryEditorProps {
  /** The entry being edited, or null while the drawer is closed. */
  entry: Entry | null;
  onClose: () => void;
  onSave: (entry: Entry, patch: LocalPatch) => Promise<ApiResult<Entry>>;
  onDelete: (entry: Entry) => void;
}

interface EditorFormProps {
  entry: Entry;
  onClose: () => void;
  onSave: EntryEditorProps["onSave"];
  onDelete: EntryEditorProps["onDelete"];
}

/** The form lives apart so its draft starts fresh from the entry each time the drawer opens. */
function EditorForm({ entry, onClose, onSave, onDelete }: EditorFormProps) {
  const [draft, setDraft] = useState<EntryDraft>(() => draftFromEntry(entry));
  const [errors, setErrors] = useState(() => validateDraft(entry, draft));
  const [shown, setShown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const kind = isMediaKind(entry.kind) ? entry.kind : null;

  function change(field: DraftField, value: string) {
    const next = { ...draft, [field]: value };
    setDraft(next);
    setErrors(validateDraft(entry, next));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setShown(true);
    if (Object.keys(errors).length > 0) return;
    const patch = patchFromDraft(entry, draft);
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setFailure("");
    const result = await onSave(entry, patch);
    setSaving(false);
    if (result.ok) onClose();
    else setFailure(failureMessage(result.failure));
  }

  if (kind === null) return null;
  const visible: DraftErrors = shown ? errors : {};

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={submit}>
      <SelectField label={copy.status}>
        <StatusSelect
          kind={kind}
          label={copy.status}
          onChange={(value) => change("status", value)}
          placeholder={copy.noStatus}
          value={draft.status}
        />
      </SelectField>

      {kind === "game" && (
        <>
          <SelectField label={copy.shelf}>
            <OptionSelect
              label={copy.shelf}
              onChange={(value) => change("shelf", value)}
              options={SHELF_OPTIONS}
              placeholder={copy.noShelf}
              selectClassName={SELECT_HEIGHT}
              value={draft.shelf}
            />
          </SelectField>
          <SelectField label={copy.device}>
            <OptionSelect
              label={copy.device}
              onChange={(value) => change("device", value)}
              options={DEVICES}
              placeholder={copy.noDevice}
              selectClassName={SELECT_HEIGHT}
              value={draft.device}
            />
          </SelectField>
          <SelectField label={copy.storefront}>
            <OptionSelect
              label={copy.storefront}
              onChange={(value) => change("storefront", value)}
              options={STOREFRONTS}
              placeholder={copy.noStorefront}
              selectClassName={SELECT_HEIGHT}
              value={draft.storefront}
            />
          </SelectField>
        </>
      )}

      <RatingInput
        error={visible.rating}
        onChange={(value) => change("rating", value)}
        value={draft.rating}
      />
      <ProgressFields draft={draft} errors={visible} kind={kind} onChange={change} />

      <label className={LOG_LABEL_CLASS}>
        {copy.notes}
        <textarea
          className={LOG_TEXTAREA_CLASS}
          maxLength={ENTRY_LIMITS.notes}
          onChange={(event) => change("notes", event.target.value)}
          value={draft.notes}
        />
      </label>

      <div role="alert">
        {failure !== "" && <p className="text-[12px] text-accent">{failure}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button className={LOG_PRIMARY_CLASS} disabled={saving} type="submit">
          {saving ? copy.saving : copy.save}
        </button>
        <button className={LOG_SECONDARY_CLASS} onClick={onClose} type="button">
          {copy.close}
        </button>
      </div>

      <div className="mt-2 border-line border-t pt-4">
        <button
          className={LOG_DANGER_CLASS}
          disabled={saving}
          onClick={() => onDelete(entry)}
          type="button"
        >
          {copy.delete}
        </button>
      </div>
    </form>
  );
}

/** The right-hand drawer for one entry: every editable field, saved together (UX-14 keeps input on failure). */
export default function EntryEditor({ entry, onClose, onSave, onDelete }: EntryEditorProps) {
  return (
    <ModalDialog
      initialFocus="heading"
      onClose={onClose}
      open={entry !== null}
      title={entry === null ? "" : copy.title.replace("{title}", entry.title)}
      variant="drawer"
    >
      {entry !== null && (
        <EditorForm
          entry={entry}
          key={entry.id}
          onClose={onClose}
          onDelete={onDelete}
          onSave={onSave}
        />
      )}
    </ModalDialog>
  );
}
