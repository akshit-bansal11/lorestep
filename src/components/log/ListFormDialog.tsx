"use client";

import { type FormEvent, useId, useState } from "react";
import ModalDialog from "@/components/log/ModalDialog";
import {
  LOG_CONTROL_CLASS,
  LOG_LABEL_CLASS,
  LOG_PRIMARY_CLASS,
  LOG_SECONDARY_CLASS,
  LOG_TEXTAREA_CLASS,
} from "@/constants/log/classes";
import { KIND_TABS } from "@/constants/log/library";
import { LIST_LIMITS } from "@/constants/log/lists";
import { LISTS_COPY } from "@/constants/log/lists-copy";
import type { ApiResult } from "@/types/api/api";
import type { ListCreate } from "@/types/log/list";
import { cn } from "@/utils/cn";
import { failureMessage } from "@/utils/log/failure-message";

const copy = LISTS_COPY.form;

/** What the dialog edits. `null` is a new list. */
export interface ListFormInitial {
  name: string;
  description: string;
  kinds: readonly string[];
}

interface ListFormDialogProps {
  open: boolean;
  /** The list being renamed, or null to create one. */
  initial: ListFormInitial | null;
  onClose: () => void;
  /** Sends the fields to the server; the dialog shows a failure and finishes only on success. */
  onSubmit: (input: Required<ListCreate>) => Promise<ApiResult<unknown>>;
  onDone: (name: string) => void;
}

type FormProps = Omit<ListFormDialogProps, "open">;

function ListForm({ initial, onClose, onSubmit, onDone }: FormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [kinds, setKinds] = useState<readonly string[]>(initial?.kinds ?? []);
  const [nameError, setNameError] = useState("");
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);
  const errorId = useId();

  function toggle(kind: string) {
    setKinds((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") {
      setNameError(copy.nameRequired);
      return;
    }
    setNameError("");
    setFailure("");
    setSaving(true);
    const ordered = KIND_TABS.map((tab) => tab.id).filter((id) => kinds.includes(id));
    const result = await onSubmit({
      name: trimmed,
      description: description.trim(),
      kinds: ordered,
    });
    setSaving(false);
    if (!result.ok) {
      setFailure(failureMessage(result.failure));
      return;
    }
    onDone(trimmed);
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={submit}>
      <label className={LOG_LABEL_CLASS}>
        {copy.name}
        <input
          aria-describedby={nameError === "" ? undefined : errorId}
          aria-invalid={nameError !== ""}
          autoComplete="off"
          className={cn(LOG_CONTROL_CLASS, "w-full")}
          maxLength={LIST_LIMITS.name}
          onChange={(event) => setName(event.target.value)}
          type="text"
          value={name}
        />
        {nameError !== "" && (
          <span className="text-[12px] text-danger" id={errorId}>
            {nameError}
          </span>
        )}
      </label>
      <label className={LOG_LABEL_CLASS}>
        {copy.description}
        <textarea
          className={LOG_TEXTAREA_CLASS}
          maxLength={LIST_LIMITS.description}
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
      </label>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-[12px] text-ink">{copy.kinds}</legend>
        <p className="text-[12px] text-muted">{copy.kindsHint}</p>
        <div className="flex flex-wrap gap-x-4">
          {KIND_TABS.map((tab) => (
            <label className="flex min-h-11 items-center gap-2 text-[13px] text-ink" key={tab.id}>
              <input
                checked={kinds.includes(tab.id)}
                className="size-4"
                onChange={() => toggle(tab.id)}
                type="checkbox"
              />
              {tab.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div role="alert">
        {failure !== "" && <p className="text-[13px] text-danger">{failure}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button className={LOG_PRIMARY_CLASS} disabled={saving} type="submit">
          {saving ? copy.saving : initial === null ? copy.create : copy.save}
        </button>
        <button className={LOG_SECONDARY_CLASS} onClick={onClose} type="button">
          {copy.cancel}
        </button>
      </div>
    </form>
  );
}

/** Create a list, or rename one: the same fields either way (`initial` tells which). */
export default function ListFormDialog({ open, initial, ...rest }: ListFormDialogProps) {
  const title =
    initial === null ? copy.createTitle : copy.editTitle.replace("{name}", initial.name);
  return (
    <ModalDialog
      initialFocus="field"
      onClose={rest.onClose}
      open={open}
      title={title}
      variant="centre"
    >
      {open && <ListForm initial={initial} {...rest} />}
    </ModalDialog>
  );
}
