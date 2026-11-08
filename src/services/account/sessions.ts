import { and, desc, eq, gt } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { sessions } from "@/lib/db/schema";
import type { DeviceSession } from "@/types/account/account";

/**
 * The user's unexpired sessions, newest first. Read directly rather than through Better-Auth's
 * `listSessions`, which returns each raw token; only display columns are selected (DB-21).
 */
export async function listDeviceSessions(userId: string): Promise<DeviceSession[]> {
  const rows = await db()
    .select({
      id: sessions.id,
      userAgent: sessions.userAgent,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
    .orderBy(desc(sessions.createdAt));
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  }));
}

/**
 * Ends one of the user's sessions by id; false when no such session is theirs (the route answers
 * 404). Deleting the row is the revocation: no cookie cache or secondary storage is configured.
 */
export async function revokeDeviceSession(userId: string, id: string): Promise<boolean> {
  const rows = await db()
    .delete(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
    .returning({ id: sessions.id });
  return rows.length > 0;
}
