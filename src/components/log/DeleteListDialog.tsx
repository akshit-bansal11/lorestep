"use client";

import { useState } from "react";
import ModalDialog from "@/components/log/ModalDialog";
import { LOG_DANGER_CLASS, LOG_SECONDARY_CLASS } from "@/constants/log/classes";
import { LISTS_COPY } from "@/constants/log/lists-copy";
import type { ApiResult } from "@/types/api/api";
import { failureMessage } from "@/utils/log/failure-message";

const copy = LISTS_COPY.remove;

interface DeleteListDialogProps {
  open: boolean;
  name: string;
  onClose: () => void;
  onConfirm: () => Promise<ApiResult<null>>;
  onDeleted: () => void;
}

type ConfirmBodyProps = Omit<DeleteListDialogProps, "open">;

function ConfirmBody({ name, onClose, onConfirm, onDeleted }: ConfirmBodyProps) {
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState("");

  async function confirm() {
    setWorking(true);
    setFailure("");
    const result = await onConfirm();
    setWorking(false);
    if (!result.ok) {
      setFailure(failureMessage(result.failure));
      return;
    }
    onDeleted();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted">{copy.body}</p>
      <div role="alert">
        {failure !== "" && <p className="text-[13px] text-danger">{failure}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={LOG_SECONDARY_CLASS} onClick={onClose} type="button">
          {LISTS_COPY.form.cancel}
        </button>
        <button className={LOG_DANGER_CLASS} disabled={working} onClick={confirm} type="button">
          {copy.confirm}
          <span className="sr-only"> {name}</span>
        </button>
      </div>
    </div>
  );
}

/** Deleting a list cannot be undone from the page, so it asks first; Cancel is the first control. */
export default function DeleteListDialog({ open, name, ...rest }: DeleteListDialogProps) {
  return (
    <ModalDialog
      initialFocus="heading"
      onClose={rest.onClose}
      open={open}
      title={copy.title.replace("{name}", name)}
      variant="centre"
    >
      {open && <ConfirmBody name={name} {...rest} />}
    </ModalDialog>
  );
}
