import type { Metadata } from "next";
import ExtensionPreview from "@/components/extension/ExtensionPreview";
import InstallSteps from "@/components/extension/InstallSteps";
import {
  BLOCK_TITLE_CLASS,
  FIELD_SECTION_CLASS,
  PAGE_CLASS,
  PAGE_TITLE_CLASS,
  PROSE_CLASS,
  SECTION_GAP_CLASS,
  SECTION_TITLE_CLASS,
  TITLE_CLASS,
} from "@/constants/canon/ui";
import {
  EXTENSION_LIBRARY_ITEMS,
  EXTENSION_PRIVACY,
  EXTENSION_STATES_LINE,
  EXTENSION_SYNC_STEPS,
  EXTENSION_VERSION,
} from "@/constants/extension/content";
import { EXTENSION_SERVICES } from "@/constants/extension/services";
import { EXTENSION_FEATURES } from "@/constants/home/extension-section";
import { cn } from "@/utils/cn";

export const metadata: Metadata = {
  title: "Lorestep for Chrome",
  description:
    "Mark what you watch on Netflix, Prime Video, JioHotstar, ZEE5, HBO Max and Crunchyroll. Works without an account and syncs to your Lorestep library when you have one.",
};

const ITEMS = [...EXTENSION_FEATURES, ...EXTENSION_LIBRARY_ITEMS];

export default function Page() {
  return (
    <main className="flex flex-1 flex-col">
      <section aria-labelledby="extension-title" className={SECTION_GAP_CLASS}>
        <div className={cn(PAGE_CLASS, "grid gap-12 lg:grid-cols-[7fr_5fr] lg:gap-24")}>
          <div className="flex flex-col gap-8">
            <h1 id="extension-title" className={PAGE_TITLE_CLASS}>
              Mark it where you watch it.
            </h1>
            <p className={PROSE_CLASS}>
              Lorestep for Chrome is version {EXTENSION_VERSION} and needs Chrome 114 or newer. It
              works without an account, on this browser only, and syncs your marks when you have
              one.
            </p>
            <p className={PROSE_CLASS}>{EXTENSION_STATES_LINE}</p>
          </div>
          <ExtensionPreview />
        </div>
      </section>

      <section aria-labelledby="extension-does" className="pb-24 lg:pb-40">
        <div className={cn(PAGE_CLASS, "flex flex-col gap-10")}>
          <h2 id="extension-does" className={BLOCK_TITLE_CLASS}>
            What it does
          </h2>
          <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
            {ITEMS.map((item, index) => (
              <li
                key={item.title}
                className={cn("rounded-card p-8", index % 2 === 0 ? "bg-surface" : "bg-raise")}
              >
                <h3 className={cn(TITLE_CLASS, "text-[24px] text-ink")}>{item.title}</h3>
                <p className="mt-3 text-muted">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="services" aria-labelledby="extension-services" className="pb-24 lg:pb-40">
        <div className={cn(PAGE_CLASS, "flex flex-col gap-8")}>
          <h2 id="extension-services" className={BLOCK_TITLE_CLASS}>
            Six services
          </h2>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {EXTENSION_SERVICES.map((service) => (
              <li
                key={service}
                className="rounded-full bg-surface px-5 py-3 font-medium text-[17px]"
              >
                {service}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="extension-sync" className="pb-24 lg:pb-40">
        <div className={cn(PAGE_CLASS, "grid gap-10 lg:grid-cols-2 lg:gap-24")}>
          <h2 id="extension-sync" className={SECTION_TITLE_CLASS}>
            Sign-in and sync
          </h2>
          <ol className="m-0 grid max-w-prose list-decimal gap-4 pl-6 text-[17px] text-muted">
            {EXTENSION_SYNC_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="extension-privacy" className="pb-24 lg:pb-40">
        <div className={cn(PAGE_CLASS, "grid gap-10 lg:grid-cols-2 lg:gap-24")}>
          <h2 id="extension-privacy" className={SECTION_TITLE_CLASS}>
            Privacy
          </h2>
          <p className={PROSE_CLASS}>{EXTENSION_PRIVACY}</p>
        </div>
      </section>

      <section
        id="install"
        aria-labelledby="extension-install"
        className={cn(FIELD_SECTION_CLASS, SECTION_GAP_CLASS)}
      >
        <div className={cn(PAGE_CLASS, "flex flex-col gap-8")}>
          <h2 id="extension-install" className={BLOCK_TITLE_CLASS}>
            Install it
          </h2>
          <p className="max-w-prose text-[17px]">
            It is not on the Chrome Web Store, so you load it from the repository.
          </p>
          <InstallSteps />
        </div>
      </section>
    </main>
  );
}
