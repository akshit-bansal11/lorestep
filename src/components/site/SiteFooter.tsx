import Link from "next/link";
import { DISPLAY_CLASS, PAGE_CLASS, QUIET_LINK_CLASS } from "@/constants/canon/ui";
import { FOOTER_COLUMNS, SITE_NAME } from "@/constants/site";
import { cn } from "@/utils/cn";

export default function SiteFooter() {
  return (
    <footer className="overflow-hidden bg-canvas pt-16 lg:pt-24">
      <nav
        aria-label="Site"
        className={cn(PAGE_CLASS, "grid grid-cols-2 gap-x-6 gap-y-10 text-[15px] lg:grid-cols-4")}
      >
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.heading}>
            <h2 className="mb-4 font-semibold text-[15px] text-ink">{column.heading}</h2>
            <ul className="flex flex-col gap-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("http") ? (
                    <a className={QUIET_LINK_CLASS} href={link.href}>
                      {link.label}
                    </a>
                  ) : (
                    <Link className={QUIET_LINK_CLASS} href={link.href}>
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <p
        aria-hidden="true"
        className={cn(
          DISPLAY_CLASS,
          "mt-16 select-none whitespace-nowrap text-center text-[clamp(5rem,25vw,30rem)] text-edge leading-[0.78] lg:mt-24",
        )}
      >
        {SITE_NAME}
      </p>
    </footer>
  );
}
