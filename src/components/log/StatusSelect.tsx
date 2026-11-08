"use client";

import OptionSelect from "@/components/canon/OptionSelect";
import { STATUS_LABELS } from "@/constants/log/copy";
import { STATUS_ORDER } from "@/constants/log/library";
import type { MediaKind } from "@/types/metadata/metadata";

interface StatusSelectProps {
  kind: MediaKind;
  value: string;
  label: string;
  /** The label of the empty choice: "No status" in the editor, "All statuses" in the filter. */
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
}

/** The kind's status choices ("Watching" for a movie, "Reading" for manga) on the shared select. */
export default function StatusSelect({
  kind,
  value,
  label,
  placeholder,
  onChange,
  className,
}: StatusSelectProps) {
  return (
    <OptionSelect
      className={className}
      label={label}
      onChange={onChange}
      options={STATUS_ORDER.map((id) => ({ id, label: STATUS_LABELS[kind][id] ?? id }))}
      placeholder={placeholder}
      selectClassName="h-11! sm:h-11! text-[13px]!"
      value={value}
    />
  );
}
