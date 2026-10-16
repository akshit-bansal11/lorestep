import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import Observability from "@/components/site/Observability";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/constants/site";
import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  // No `url`: every page inherits this block, and a fixed one would point every
  // shared link's card at the home page.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Matches --tone-canvas, so a mobile browser's chrome runs into the page.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e0d" },
  ],
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
