import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListDetailApp from "@/components/log/ListDetailApp";
import { pageSession } from "@/lib/auth/page-session";
import { listIdSchema } from "@/schemas/log/list";

export const metadata: Metadata = {
  title: "List — Lorestep",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/** One signed-in list. A malformed id is a 404 before any query; a foreign one 404s in the API. */
export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const parsed = listIdSchema.safeParse(id);
  if (!parsed.success) notFound();

  await pageSession(`/lists/${parsed.data}`);

  return <ListDetailApp id={parsed.data} />;
}
