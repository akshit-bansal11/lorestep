import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { entries, entryLinks, listItems, lists } from "@/lib/db/schema";
import type { AccountExport } from "@/types/account/account";
import type { SessionAccount } from "@/types/auth/auth";

/**
 * Every row the user owns, read in one batch so the file is one consistent snapshot. Soft-deleted
 * rows are included while they exist (they are still the user's data). The profile comes from the
 * Neon Auth session; `neon_auth` is never read, so no credential can reach the file (SEC-22).
 */
export async function exportAccount(account: SessionAccount): Promise<AccountExport> {
  const client = db();
  const { userId } = account;
  const [entryRows, linkRows, listRows, itemRows] = await client.batch([
    client.select().from(entries).where(eq(entries.userId, userId)),
    client.select().from(entryLinks).where(eq(entryLinks.userId, userId)),
    client.select().from(lists).where(eq(lists.userId, userId)),
    client.select().from(listItems).where(eq(listItems.userId, userId)),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: { id: userId, name: account.name, email: account.email },
    entries: entryRows,
    entryLinks: linkRows,
    lists: listRows,
    listItems: itemRows,
  };
}
