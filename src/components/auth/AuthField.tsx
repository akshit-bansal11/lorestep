import { useId } from "react";
import { AUTH_INPUT_CLASS } from "@/constants/auth/classes";
import { cn } from "@/utils/cn";

interface AuthFieldProps {
  name: string;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  error: string | undefined;
  hint?: string;
  disabled: boolean;
}

/**
 * A labelled field with its control nested in the label. The hint and the error sit outside the
 * label, so the control's accessible name stays "Email" and the extra text arrives through
 * `aria-describedby`.
 */
export default function AuthField({
  name,
  label,
  type,
  autoComplete,
  error,
  hint,
  disabled,
}: AuthFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const described = [hint === undefined ? "" : hintId, error === undefined ? "" : errorId]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5 text-[12px] text-ink">
        {label}
        <input
          aria-describedby={described === "" ? undefined : described}
          aria-invalid={error === undefined ? undefined : true}
          autoCapitalize="none"
          autoComplete={autoComplete}
          className={cn(AUTH_INPUT_CLASS, error !== undefined && "border-danger")}
          disabled={disabled}
          name={name}
          spellCheck={false}
          type={type}
        />
      </label>
      {hint !== undefined && (
        <p className="text-[12px] text-muted" id={hintId}>
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p className="text-[12px] text-danger" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
