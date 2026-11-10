import { TITLE_CLASS } from "@/constants/canon/ui";
import type { Entry } from "@/types/log/entry";
import { cn } from "@/utils/cn";

interface EntryPosterProps {
  entry: Entry;
  /** Sizing from the layout; the poster is always 2:3. */
  className?: string;
  /** Text size and padding for the typographic fallback. */
  textClassName?: string;
}

/**
 * The cover when the entry has one, else its title set as a typographic poster. The title is read
 * beside it, so the image is decorative.
 */
export default function EntryPoster({ entry, className, textClassName }: EntryPosterProps) {
  const frame = cn("aspect-[2/3] shrink-0 overflow-hidden rounded-control bg-raise", className);
  if (entry.imageUrl !== null) {
    return (
      <img
        alt=""
        className={cn(frame, "object-cover")}
        decoding="async"
        loading="lazy"
        src={entry.imageUrl}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(frame, "flex items-end p-2 text-ink", TITLE_CLASS, textClassName)}
    >
      {entry.title}
    </span>
  );
}
