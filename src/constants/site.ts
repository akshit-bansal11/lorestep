import type { FooterColumn } from "@/types/site/footer";

/** The one canonical origin. Metadata, the sitemap and robots all resolve against it. */
export const SITE_URL = "https://lorestep.akshitbansal.dev";

export const SITE_NAME = "Lorestep";

export const SITE_DESCRIPTION =
  "Story order for connected franchises — what to play, watch and read in in-universe chronology rather than release order.";

/** Every route that exists independently of the dataset. Per-chronology pages are added from the database. */
export const STATIC_ROUTES = [
  "/",
  "/games",
  "/screen",
  "/books",
  "/about",
  "/docs",
  "/extension",
] as const;

export const REPO_URL = "https://github.com/akshit-bansal11/lorestep";

/** The site's own pages, linked from the games header and the footer alike. */
export const PAGE_LINKS = [
  { href: "/about", label: "About" },
  { href: "/docs", label: "Docs" },
] as const;

/** Footer-only links, off the site. */
export const EXTERNAL_LINKS = [
  { href: REPO_URL, label: "GitHub" },
  { href: `${REPO_URL}/blob/main/LICENSE`, label: "MIT License" },
] as const;

/** The header's sections. */
export const SITE_NAV = [
  { href: "/screen", label: "Watch orders" },
  { href: "/games", label: "Games" },
  { href: "/library", label: "Tracker" },
  { href: "/extension", label: "Extension" },
] as const;

/** The footer's four columns. */
export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    heading: "Watch orders",
    links: [
      { href: "/screen", label: "Movies & Series" },
      { href: "/games", label: "Games" },
      { href: "/books", label: "Books" },
    ],
  },
  {
    heading: "Tracker",
    links: [
      { href: "/library", label: "Library" },
      { href: "/lists", label: "Lists" },
      { href: "/account", label: "Account" },
    ],
  },
  {
    heading: "Extension",
    links: [
      { href: "/extension", label: "Lorestep for Chrome" },
      { href: "/extension#services", label: "Supported services" },
    ],
  },
  { heading: SITE_NAME, links: [...PAGE_LINKS, ...EXTERNAL_LINKS] },
];
