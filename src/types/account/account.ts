import type { entries, entryLinks, listItems, lists } from "@/lib/db/schema";

/** One signed-in session as the account page shows it. No token ever leaves the server. */
export interface DeviceSession {
  id: string;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface ExportProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
}

/** GET /api/v1/account/export: every row the user owns, no credential columns (SEC-22). */
export interface AccountExport {
  exportedAt: string;
  profile: ExportProfile | null;
  entries: (typeof entries.$inferSelect)[];
  entryLinks: (typeof entryLinks.$inferSelect)[];
  lists: (typeof lists.$inferSelect)[];
  listItems: (typeof listItems.$inferSelect)[];
}

/** Rows hard-deleted by one purge run, per table. A type alias, so it fits `execute<Row>`. */
export type PurgeResult = {
  entries: number;
  lists: number;
  sessions: number;
  verifications: number;
  deviceCodes: number;
  rateLimits: number;
  authRateLimits: number;
};

export interface SessionRouteContext {
  params: Promise<{ id: string }>;
}
