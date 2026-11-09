import type { entries, entryLinks, listItems, lists } from "@/lib/db/schema";

/** One signed-in session as the account page shows it. No token ever leaves the server. */
export interface DeviceSession {
  id: string;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

/** The profile as Neon Auth's session reports it; `neon_auth` is never read (PLAN.md N-10). */
export interface ExportProfile {
  id: string;
  name: string;
  email: string;
}

/** GET /api/v1/account/export: every row the user owns, no credential (SEC-22). */
export interface AccountExport {
  exportedAt: string;
  profile: ExportProfile;
  entries: (typeof entries.$inferSelect)[];
  entryLinks: (typeof entryLinks.$inferSelect)[];
  lists: (typeof lists.$inferSelect)[];
  listItems: (typeof listItems.$inferSelect)[];
}

/** Rows hard-deleted by one purge run, per table. A type alias, so it fits `execute<Row>`. */
export type PurgeResult = {
  entries: number;
  lists: number;
  rateLimits: number;
};

export interface SessionRouteContext {
  params: Promise<{ id: string }>;
}
