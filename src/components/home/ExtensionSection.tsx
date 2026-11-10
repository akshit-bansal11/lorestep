import Link from "next/link";
import ExtensionPreview from "@/components/extension/ExtensionPreview";
import {
  ACTION_CLASS,
  ACTION_GHOST_CLASS,
  BLOCK_TITLE_CLASS,
  PAGE_CLASS,
  PROSE_CLASS,
  SECTION_GAP_CLASS,
  TITLE_CLASS,
} from "@/constants/canon/ui";
import { EXTENSION_SERVICES } from "@/constants/extension/services";
import { EXTENSION_FEATURES } from "@/constants/home/extension-section";
import type { HomeSectionProps } from "@/types/home/section-props";
import { cn } from "@/utils/cn";

export default function ExtensionSection({ className }: HomeSectionProps) {
  return (
    <section aria-labelledby="home-extension" className={cn(SECTION_GAP_CLASS, className)}>
      <div className={cn(PAGE_CLASS, "grid gap-12 lg:grid-cols-[7fr_5fr] lg:gap-24")}>
        <div className="flex flex-col gap-8">
          <h2 id="home-extension" className={BLOCK_TITLE_CLASS}>
            Mark it where you watch it.
          </h2>
          <p className={PROSE_CLASS}>
            Lorestep for Chrome (114 or newer) works without an account and syncs your marks when
            you have one.
          </p>
          <ol className="m-0 grid list-none gap-5 p-0">
            {EXTENSION_FEATURES.map((feature, index) => (
              <li key={feature.title} className="grid grid-cols-[44px_minmax(0,1fr)] gap-4">
                <span
                  aria-hidden="true"
                  className={cn(
                    TITLE_CLASS,
                    "grid size-11 place-items-center rounded-full bg-raise text-[20px] tabular-nums",
                  )}
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-[18px] text-ink">{feature.title}</h3>
                  <p className="text-muted">{feature.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <ul aria-label="Supported services" className="m-0 flex list-none flex-wrap gap-2 p-0">
            {EXTENSION_SERVICES.map((service) => (
              <li
                key={service}
                className="rounded-full bg-surface px-4 py-2.5 font-medium text-[15px]"
              >
                {service}
              </li>
            ))}
          </ul>
          <Link href="/extension" className={cn(ACTION_CLASS, ACTION_GHOST_CLASS, "self-start")}>
            About the extension
          </Link>
        </div>
        <ExtensionPreview />
      </div>
    </section>
  );
}
