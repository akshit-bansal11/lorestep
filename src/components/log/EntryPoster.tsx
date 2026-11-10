import Image from "next/image";

import { TITLE_CLASS } from "@/constants/canon/ui";
import { POSTER_SIZES } from "@/constants/log/poster";
import type { Entry } from "@/types/log/entry";
import { cn } from "@/utils/cn";

interface EntryPosterProps {
  entry: Entry;
  /** Sizing from the layout; the poster is always 2:3. */
  className?: string;
  /** Text size and padding for the typographic fallback. */
  textClassName?: string;
  /** The image's rendered width per breakpoint (`next/image` `sizes`). */
  sizes?: string;
}

/**
 * The cover when the entry has one, else its title set as a typographic poster. The title is read
 * beside it, so the image is decorative. `unoptimized`: TMDB and MyAnimeList already serve sized
 * posters, and a user's own image URL may be on any https host.
 */
export default function EntryPoster({
  entry,
  className,
  textClassName,
  sizes = POSTER_SIZES.card,
}: EntryPosterProps) {
  const frame = cn("aspect-[2/3] shrink-0 overflow-hidden rounded-control bg-raise", className);
  if (entry.imageUrl !== null) {
    return (
      <span className={cn(frame, "relative block")}>
        <Image
          alt=""
          className="object-cover"
          fill
          referrerPolicy="no-referrer"
          sizes={sizes}
          src={entry.imageUrl}
          unoptimized
        />
      </span>
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
