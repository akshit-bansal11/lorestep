import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ScreenTimeline from "@/components/screen/ScreenTimeline";
import {
  CONTROL_CLASS,
  NUM_CLASS,
  PAGE_CLASS,
  PAGE_TITLE_CLASS,
  PROSE_CLASS,
} from "@/constants/canon/ui";
import { listScreen } from "@/lib/db/queries";
import { cn } from "@/utils/cn";

export const revalidate = 3600;

/** Prerendered per chronology, so every one is static rather than rendered on
 *  demand. Six routes, all known at build time. */
export async function generateStaticParams() {
  const franchises = await listScreen();
  return franchises.map((franchise) => ({ slug: franchise.id }));
}

async function findFranchise(slug: string) {
  const franchises = await listScreen();
  return franchises.find((franchise) => franchise.id === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const franchise = await findFranchise(slug);
  if (franchise === null) return { title: "Not found — Lorestep" };

  return {
    title: `${franchise.title} — Lorestep`,
    description: franchise.description,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const franchise = await findFranchise(slug);
  if (franchise === null) notFound();

  const titles = franchise.entries.filter((entry) => entry.kind === "title").length;
  const markers = franchise.entries.length - titles;

  return (
    <main className={cn(PAGE_CLASS, "flex flex-1 flex-col gap-8 py-12 lg:py-16")}>
      <header className="flex flex-col gap-3">
        <Link className={cn(CONTROL_CLASS, "inline-flex w-fit items-center px-3")} href="/screen">
          ← Movies &amp; Series
        </Link>
        <h1 className={PAGE_TITLE_CLASS}>{franchise.title}</h1>
        <p className={cn(NUM_CLASS, "flex flex-wrap items-center gap-x-2 text-[10px] text-faint")}>
          <span>{titles} titles</span>
          {markers > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{markers} placement notes</span>
            </>
          ) : null}
          {franchise.groups.length > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{franchise.groups.length} blocks</span>
            </>
          ) : null}
        </p>
        {franchise.description === "" ? null : (
          <p className={PROSE_CLASS}>{franchise.description}</p>
        )}
      </header>

      <ScreenTimeline franchise={franchise} />
    </main>
  );
}
