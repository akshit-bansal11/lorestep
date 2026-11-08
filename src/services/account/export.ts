import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { entries, entryLinks, listItems, lists, users } from "@/lib/db/schema";
import type { AccountExport } from "@/types/account/account";

/**
 * Every row the user owns, read in one batch so the file is one consistent snapshot. Soft-deleted
 * rows are included while they exist (they are still the user's data). `sessions`, `accounts` and
 * `verifications` are never read: they hold credentials (SEC-22).
 */
export async function exportAccount(userId: string): Promise<AccountExport> {
  const client = db();
  const [profile, entryRows, linkRows, listRows, itemRows] = await client.batch([
    client
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        image: users.image,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId)),
    client.select().from(entries).where(eq(entries.userId, userId)),
    client.select().from(entryLinks).where(eq(entryLinks.userId, userId)),
    client.select().from(lists).where(eq(lists.userId, userId)),
    client.select().from(listItems).where(eq(listItems.userId, userId)),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: profile[0] ?? null,
    entries: entryRows,
    entryLinks: linkRows,
    lists: listRows,
    listItems: itemRows,
  };
}
