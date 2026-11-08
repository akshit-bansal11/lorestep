import type { Metadata } from "next";
import { Suspense } from "react";
import ResetForm from "@/components/auth/ResetForm";

export const metadata: Metadata = {
  title: "Reset your password — Lorestep",
  robots: { index: false, follow: false },
};

/** `ResetForm` reads the link's query string on the client, so the page itself stays prerendered. */
export default function Page() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <ResetForm />
    </Suspense>
  );
}
