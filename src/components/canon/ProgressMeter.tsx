import { cn } from "@/utils/cn";

interface ProgressMeterProps {
  done: number;
  total: number;
  label: string;
  className?: string;
}

export default function ProgressMeter({ done, total, label, className }: ProgressMeterProps) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={pct}
      className={cn("h-[3px] w-full overflow-hidden rounded-full bg-line", className)}
      role="progressbar"
    >
      {/* Width is data, not design — it cannot live in a class. */}
      <span
        className="block h-full rounded-full bg-accent transition-[width] duration-[420ms] ease-out motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
