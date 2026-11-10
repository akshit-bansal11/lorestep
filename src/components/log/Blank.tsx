import { LIBRARY_COPY } from "@/constants/log/copy";

/** The muted placeholder for an empty cell; screen readers hear "Not set". */
export default function Blank() {
  return (
    <span className="text-faint">
      <span aria-hidden="true">{LIBRARY_COPY.noValue}</span>
      <span className="sr-only">{LIBRARY_COPY.notSet}</span>
    </span>
  );
}
