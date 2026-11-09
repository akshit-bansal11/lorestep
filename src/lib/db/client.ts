import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/lib/db/schema";

/** DATABASE_URL, or a thrown error naming the fix. Read at use, never at import. */
export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (url === undefined || url === "") {
    throw new Error(
      "DATABASE_URL is not set. Copy it from the Neon dashboard into .env.local, or set it in the Vercel project's environment variables.",
    );
  }

  return url;
}

/**
 * A Neon client for server components and scripts.
 *
 * Uses Neon's HTTP driver rather than a pooled TCP connection. Every read here
 * happens at build or revalidation time from a short-lived serverless
 * invocation, which is exactly the shape HTTP suits — a connection pool would
 * spend its life being opened and thrown away.
 *
 * Built per call rather than held in a module constant so that a missing
 * DATABASE_URL fails at the point of use with a message naming the fix, rather
 * than throwing during module evaluation somewhere with no useful stack.
 */
export function db() {
  return drizzle(neon(databaseUrl()), { schema });
}
