import Link from "next/link";
import ThemeToggle from "@/components/canon/ThemeToggle";
import Logo from "@/components/site/Logo";
import SiteNav from "@/components/site/SiteNav";
import { PAGE_CLASS } from "@/constants/canon/ui";
import { SITE_NAME } from "@/constants/site";
import { cn } from "@/utils/cn";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-line border-b bg-canvas/85 backdrop-blur-md">
      <div className={cn(PAGE_CLASS, "flex flex-wrap items-center gap-x-6 gap-y-1 py-2.5")}>
        <Link className="flex items-center gap-2 rounded-control py-1 pr-1" href="/">
          <Logo className="size-6 text-ink" />
          <span className="font-medium text-[15px] text-ink tracking-[-0.02em]">{SITE_NAME}</span>
        </Link>
        <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
          <SiteNav />
        </div>
        <div className="ml-auto sm:ml-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
