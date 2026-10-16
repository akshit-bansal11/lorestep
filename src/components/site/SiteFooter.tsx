import Link from "next/link";
import { QUIET_LINK_CLASS } from "@/constants/canon/ui";
import { EXTERNAL_LINKS, PAGE_LINKS, SITE_NAME } from "@/constants/site";

export default function SiteFooter() {
  return (
    <footer className="border-line border-t">
      <nav
        aria-label="Site"
        className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-5 text-[11px]"
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
