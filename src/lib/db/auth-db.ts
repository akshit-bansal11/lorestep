import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import { databaseUrl } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

/**
 * The auth adapter's client: Neon's WebSocket `Pool`, not neon-http, because Better-Auth runs
 * password reset and session revocation in one transaction (`transaction: true` on the adapter)
 * and neon-http has none (PLAN.md section 11, R2). Catalog reads keep `db()`.
 *
 * Node 24 has a global WebSocket, so no `ws` constructor is configured.
 */
export function authDb() {
  return drizzle(new Pool({ connectionString: databaseUrl() }), { schema });
}
