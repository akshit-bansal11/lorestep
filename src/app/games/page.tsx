import type { Metadata } from "next";
import CanonApp from "@/components/canon/CanonApp";
import { listFranchises } from "@/lib/db/queries";

/**
 * Canon data changes when someone edits it, which is rarely, so the page is
 * statically generated and revalidated on a timer rather than queried per
 * visitor. Verify with `next build`: this route must report as static, not as
 * server-rendered on demand.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Games — Lorestep",
  description:
    "Connected game franchises sorted by in-universe chronology rather than release order.",
};

export default async function Page() {
  const franchises = await listFranchises();

  return <CanonApp franchises={franchises} />;
}
