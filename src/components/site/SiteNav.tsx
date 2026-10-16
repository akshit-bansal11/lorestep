"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_NAV } from "@/constants/site";
import { cn } from "@/utils/cn";

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="-mx-1 flex min-w-0 items-center gap-0.5 overflow-x-auto">
      {SITE_NAV.map((link) => {
        const current = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            aria-current={current ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-control px-2 py-1.5 text-[12px] transition-colors duration-[160ms] motion-reduce:transition-none",
              current ? "bg-accent-soft text-ink" : "text-muted hover:bg-surface hover:text-ink",
            )}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
