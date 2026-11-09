import { requireUser } from "@/lib/auth/require-user";

/** The signed-in browser user's id (account and import routes). Same rules as `requireUser`. */
export async function requireSessionUser(request: Request): Promise<string> {
  return (await requireUser(request)).userId;
}
