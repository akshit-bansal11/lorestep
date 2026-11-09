import type { ReactNode } from "react";

interface SelectFieldProps {
  label: string;
  children: ReactNode;
}

/**
 * A visible label over a select that names itself with `aria-label` (the shared `OptionSelect`).
 * The visible text is hidden from assistive tech so the name is read once, and it matches the
 * select's own name exactly.
 */
export default function SelectField({ label, children }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span aria-hidden="true" className="text-[12px] text-ink">
        {label}
      </span>
      {children}
    </div>
  );
}
