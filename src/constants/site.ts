/** The one canonical origin. Metadata, the sitemap and robots all resolve against it. */
export const SITE_URL = "https://lorestep.vercel.app";

export const SITE_NAME = "Lorestep";

export const SITE_DESCRIPTION =
  "Story order for connected franchises — what to play, watch and read in in-universe chronology rather than release order.";

/** Every route that exists independently of the dataset. Per-chronology pages are added from the database. */
export const STATIC_ROUTES = ["/", "/games", "/screen", "/books"] as const;
