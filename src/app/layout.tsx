import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import Observability from "@/components/site/Observability";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Lorestep",
  description:
    "Story order for connected franchises — games, movies and series, in in-universe chronology.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script src="/theme.js" strategy="beforeInteractive" />
        {children}
        <Observability />
        {/* Vercel Web Analytics. No account, no key and no per-project setup:
            it is enabled by the platform the app already deploys to, and it is
            readable from a session through the Vercel API, which a dashboard-
            gated analytics key is not. It is a no-op off Vercel, so local runs
            and CI stay silent. */}
        <Analytics />
      </body>
    </html>
  );
}
