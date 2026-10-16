import type { ReactNode } from "react";

interface ProseSectionProps {
  /** Anchor for the section, and the id its heading is labelled by. */
  id: string;
  title: string;
  children: ReactNode;
}

export default function ProseSection({ id, title, children }: ProseSectionProps) {
  const headingId = `${id}-heading`;

  return (
    <section aria-labelledby={headingId} className="flex scroll-mt-6 flex-col gap-3" id={id}>
      <h2 className="font-medium text-[15px] text-ink tracking-[-0.01em]" id={headingId}>
        {title}
      </h2>
      {children}
    </section>
  );
}
