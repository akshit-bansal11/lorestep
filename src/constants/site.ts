/** The one canonical origin. Metadata, the sitemap and robots all resolve against it. */
export const SITE_URL = "https://lorestep.akshitbansal.dev";

export const SITE_NAME = "Lorestep";

export const SITE_DESCRIPTION =
  "Story order for connected franchises — what to play, watch and read in in-universe chronology rather than release order.";

/** Every route that exists independently of the dataset. Per-chronology pages are added from the database. */
export const STATIC_ROUTES = ["/", "/games", "/screen", "/books", "/about", "/docs"] as const;

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

/** The header's sections, in the order the home page lists them, then the site's own pages. */
export const SITE_NAV = [
  { href: "/games", label: "Games" },
  { href: "/screen", label: "Movies & Series" },
  ...PAGE_LINKS,
] as const;
