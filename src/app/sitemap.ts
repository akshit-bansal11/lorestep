import type { MetadataRoute } from "next";
import { SITE_URL, STATIC_ROUTES } from "@/constants/site";
import { listScreen } from "@/lib/db/queries";

/** Built with the pages, from the same read, so a chronology added to the database is listed on the next revalidation. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const chronologies = await listScreen();

  return [
    ...STATIC_ROUTES.map((route) => ({ url: `${SITE_URL}${route}` })),
    ...chronologies.map((chronology) => ({ url: `${SITE_URL}/screen/${chronology.id}` })),
  ];
}
