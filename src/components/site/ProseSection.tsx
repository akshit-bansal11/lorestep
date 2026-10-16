import type { ReactNode } from "react";
import { SECTION_TITLE_CLASS } from "@/constants/canon/ui";
import { cn } from "@/utils/cn";

interface ProseSectionProps {
  /** Anchor for the section, and the id its heading is labelled by. */
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}

export default function ProseSection({ id, title, children, className }: ProseSectionProps) {
  const headingId = `${id}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex scroll-mt-20 flex-col gap-3", className)}
      id={id}
    >
      <h2 className={SECTION_TITLE_CLASS} id={headingId}>
        {title}
      </h2>
      {children}
    </section>
  );
}
