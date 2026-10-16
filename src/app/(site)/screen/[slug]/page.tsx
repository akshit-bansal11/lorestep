import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ScreenTimeline from "@/components/screen/ScreenTimeline";
import { CONTROL_CLASS, NUM_CLASS } from "@/constants/canon/ui";
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-12">
      <header className="flex flex-col gap-3">
        <Link className={cn(CONTROL_CLASS, "inline-flex w-fit items-center px-3")} href="/screen">
          ← Movies &amp; Series
        </Link>
        <h1 className="font-medium text-[22px] text-ink leading-tight tracking-[-0.02em]">
          {franchise.title}
        </h1>
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
          <p className="max-w-prose text-[13px] text-muted leading-relaxed">
            {franchise.description}
          </p>
        )}
      </header>

      <ScreenTimeline franchise={franchise} />
    </main>
  );
}
