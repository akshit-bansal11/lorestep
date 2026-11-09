import { neonAuth } from "@/lib/auth/neon-auth";
import { neonData } from "@/lib/auth/neon-result";
import type { DeviceSession } from "@/types/account/account";

/**
 * The caller's sessions from Neon Auth, newest first, display fields only: the token each one
 * carries never leaves this file (DB-21). Neon Auth reads the caller from the request cookie.
 */
export async function listDeviceSessions(): Promise<DeviceSession[]> {
  const sessions = neonData(await neonAuth().listSessions());
  return sessions
    .map((session) => ({
      id: session.id,
      userAgent: session.userAgent ?? null,
      // `new Date` because the JSON transport may hand back strings where the type says Date.
      createdAt: new Date(session.createdAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Ends one of the caller's sessions by id; false when the id is not in the caller's own
 * `listSessions()` (the route answers 404), so no other user's session can be named. Neon revokes
 * by token, which is looked up here and never exposed.
 */
export async function revokeDeviceSession(id: string): Promise<boolean> {
  const target = neonData(await neonAuth().listSessions()).find((session) => session.id === id);
  if (target === undefined) return false;
  neonData(await neonAuth().revokeSession({ token: target.token }));
  return true;
}
