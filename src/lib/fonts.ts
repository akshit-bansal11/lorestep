import localFont from "next/font/local";

// The three type roles (docs/design/PLAN.md section A). globals.css maps the
// --nf-* variables to --font-display, --font-title and --font-sans.
// Local files (Latin subset, OFL, licences beside them in src/app/fonts) rather
// than next/font/google: Turbopack's Google font fetch failed in CI.
export const displayFont = localFont({
  src: "../app/fonts/big-shoulders-display-latin.woff2",
  weight: "700 900",
  display: "swap",
  variable: "--nf-display",
});

export const titleFont = localFont({
  src: "../app/fonts/gloock-latin.woff2",
  weight: "400",
  display: "swap",
  variable: "--nf-title",
});

export const textFont = localFont({
  src: "../app/fonts/hanken-grotesk-latin.woff2",
  weight: "400 600",
  display: "swap",
  variable: "--nf-text",
});
