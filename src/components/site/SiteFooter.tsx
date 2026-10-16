import Link from "next/link";
import { PAGE_CLASS, QUIET_LINK_CLASS } from "@/constants/canon/ui";
import { EXTERNAL_LINKS, PAGE_LINKS, SITE_NAME } from "@/constants/site";
import { cn } from "@/utils/cn";

export default function SiteFooter() {
  return (
    <footer className="border-line border-t">
      <nav
        aria-label="Site"
        className={cn(
          PAGE_CLASS,
          "flex flex-wrap items-center gap-x-4 gap-y-2 py-5 text-[11px] lg:text-[12px]",
        )}
      >
        <Link className={QUIET_LINK_CLASS} href="/">
          {SITE_NAME}
        </Link>
        {PAGE_LINKS.map((link) => (
          <Link className={QUIET_LINK_CLASS} href={link.href} key={link.href}>
            {link.label}
          </Link>
        ))}
        {EXTERNAL_LINKS.map((link) => (
          <a className={QUIET_LINK_CLASS} href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
