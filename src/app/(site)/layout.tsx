import type { ReactNode } from "react";
import SiteFooter from "@/components/site/SiteFooter";

/**
 * Every document-flow page, and not the games view. That one is a fixed
 * `h-dvh` shell whose panes scroll internally; a footer under it would give
 * the document something to scroll, which is exactly what that layout avoids.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {children}
      <SiteFooter />
    </div>
  );
}
