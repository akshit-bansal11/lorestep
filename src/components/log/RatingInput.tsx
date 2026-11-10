"use client";

import { useId } from "react";
import { LOG_CONTROL_CLASS, LOG_LABEL_CLASS } from "@/constants/log/classes";
import { LIBRARY_COPY } from "@/constants/log/copy";
import { RATING_MAX, RATING_MIN } from "@/constants/log/entries";
import { cn } from "@/utils/cn";

interface RatingInputProps {
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
}

/**
 * A 1 to 10 rating as a number field: typed or stepped with the arrow keys, empty for none. Plotline's
 * star widget is a pointer control; a native number input is keyboard and screen-reader complete.
 */
export default function RatingInput({ value, error, onChange }: RatingInputProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label className={LOG_LABEL_CLASS}>
        {LIBRARY_COPY.editor.rating}
        <input
          aria-describedby={error === undefined ? hintId : `${hintId} ${errorId}`}
          aria-invalid={error === undefined ? undefined : true}
          className={cn(LOG_CONTROL_CLASS, "w-28", error !== undefined && "border-danger")}
          inputMode="numeric"
          max={RATING_MAX}
          min={RATING_MIN}
          onChange={(event) => onChange(event.target.value)}
          type="number"
          value={value}
        />
      </label>
      <p className="text-[12px] text-muted" id={hintId}>
        {LIBRARY_COPY.editor.ratingHint}
      </p>
      {error !== undefined && (
        <p className="text-[12px] text-danger" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
