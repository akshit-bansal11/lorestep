import type { ReactNode } from "react";
import { APP_TITLE_CLASS, CARD_CLASS, PAGE_CLASS, PROSE_CLASS } from "@/constants/canon/ui";
import { cn } from "@/utils/cn";

interface AuthShellProps {
  title: string;
  lead: string;
  children: ReactNode;
  /** The line under the card that points at the sibling page. */
  footer?: ReactNode;
}

/** The frame every auth page shares: one centred column, a heading, a card, a way across. */
export default function AuthShell({ title, lead, children, footer }: AuthShellProps) {
  return (
    <main className={cn(PAGE_CLASS, "flex flex-1 flex-col items-center py-12 lg:py-16")}>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className={APP_TITLE_CLASS}>{title}</h1>
          <p className={PROSE_CLASS}>{lead}</p>
        </header>
        <div className={cn(CARD_CLASS, "flex flex-col gap-4 p-5")}>{children}</div>
        {footer !== undefined && <p className="text-[13px] text-muted">{footer}</p>}
      </div>
    </main>
  );
}
