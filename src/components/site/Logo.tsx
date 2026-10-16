import { cn } from "@/utils/cn";

interface LogoProps {
  className?: string;
}

/** The mark, drawn in the current text colour with the accent marker. Decorative: it always sits beside the name. */
export default function Logo({ className }: LogoProps) {
  return (
    <svg aria-hidden="true" className={cn("shrink-0", className)} fill="none" viewBox="0 0 32 32">
      <path
        d="M5 27h7v-7h7v-7h8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
      />
      <circle className="fill-accent" cx={23} cy={6.5} r={3} />
    </svg>
  );
}
