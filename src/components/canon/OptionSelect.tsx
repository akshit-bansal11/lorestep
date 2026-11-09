"use client";

import { CONTROL_CLASS } from "@/constants/canon/ui";
import type { Option } from "@/types/canon/user";
import { cn } from "@/utils/cn";

interface OptionSelectProps {
  value: string;
  label: string;
  placeholder: string;
  options: readonly Option[];
  onChange: (value: string) => void;
  className?: string;
  /** Extra classes for the `<select>` itself, such as a taller touch height. */
  selectClassName?: string;
}

export default function OptionSelect({
  value,
  label,
  placeholder,
  options,
  onChange,
  className,
  selectClassName,
}: OptionSelectProps) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <select
        aria-label={label}
        className={cn(
          CONTROL_CLASS,
          "w-full appearance-none pr-5",
          value === "" ? "text-faint" : "text-ink",
          selectClassName,
        )}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[9px] text-faint"
      >
        ▼
      </span>
    </span>
  );
}
