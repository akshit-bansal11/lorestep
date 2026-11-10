import { STATUS_LABELS } from "@/constants/log/copy";
import { STATUS_TONE } from "@/constants/log/status-tone";
import type { StatusChipProps } from "@/types/log/status-chip";
import { cn } from "@/utils/cn";

export default function StatusChip({ status, kind, className }: StatusChipProps) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold text-[12px] text-status-ink leading-none",
        tone.fill,
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        className="size-3.5"
        fill={tone.filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={tone.path} />
      </svg>
      {STATUS_LABELS[kind][status] ?? status}
    </span>
  );
}
