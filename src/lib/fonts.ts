import { Big_Shoulders, Gloock, Hanken_Grotesk } from "next/font/google";

// The three type roles (docs/design/PLAN.md section A). globals.css maps the
// --nf-* variables to --font-display, --font-title and --font-sans.
export const displayFont = Big_Shoulders({
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
  variable: "--nf-display",
});

export const titleFont = Gloock({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  variable: "--nf-title",
});

export const textFont = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  variable: "--nf-text",
});
