#!/usr/bin/env node

// Applies the SQL files in db/migrations to DATABASE_URL, once each, in filename order, and
// records every applied name in schema_migrations (created by 0000_schema_migrations.sql).
//
// Each file runs in its own transaction together with the row that records it, so a failed
// migration leaves neither its changes nor its record behind. A migration file must therefore not
// contain BEGIN/COMMIT or anything Postgres refuses inside a transaction (CREATE INDEX
// CONCURRENTLY). It uses the Neon WebSocket Pool, not neon-http: neon-http sends one statement per
// request and has no transactions.
//
// It refuses to run at all until Neon Auth is enabled on the target branch: 0002's foreign keys
// point at the managed `neon_auth."user"` table (PLAN.md section 12, N-9).
//
// It refuses a non-localhost database outside CI unless --allow-remote is passed: production
// migrations run from .github/workflows/migrate.yml, behind the `production` environment.
//
// Usage:
//   npm run db:migrate                                apply every pending migration
//   npm run db:migrate -- --down 0001_name.sql        revert the newest applied migration
//   npm run db:migrate -- --allow-remote              outside CI, against a remote database

import { readdirSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { Pool } from "@neondatabase/serverless";
import {
  downFileFor,
  isLocalDatabase,
  orderMigrations,
  pendingMigrations,
} from "../src/lib/db/migrate-order.ts";

const { values } = parseArgs({
  options: {
    down: { type: "string" },
    "allow-remote": { type: "boolean", default: false },
  },
});

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local, then re-run.");
  process.exit(1);
}
if (!process.env.CI && !values["allow-remote"] && !isLocalDatabase(url)) {
  console.error("Refusing a non-localhost DATABASE_URL outside CI; pass --allow-remote.");
  process.exit(1);
}

const dir = new URL("../db/migrations/", import.meta.url);
const read = (name) => readFileSync(new URL(name, dir), "utf8");
const ordered = orderMigrations(readdirSync(dir));

const pool = new Pool({ connectionString: url });
const client = await pool.connect();

async function inTransaction(work) {
  await client.query("BEGIN");
  try {
    await work();
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

try {
  const auth = await client.query(`SELECT to_regclass('neon_auth."user"') IS NOT NULL AS ok`);
  if (!auth.rows[0]?.ok) {
    throw new Error(
      "Neon Auth is not enabled on this branch. Enable it (Console > Auth), then re-run.",
    );
  }

  // Account erase deletes the neon_auth."user" row directly. Every neon_auth table with a user-id
  // column either cascades from it or is deleted by erase itself (src/services/account/erase.ts
  // reads the same catalog at erase time), so nothing here fails; it prints each table and its
  // FK delete rule (c = cascade, a = no action, r = restrict, n = set null, d = set default,
  // none = no FK) for the deploy log. Read-only.
  const userTables = await client.query(`
    SELECT c.table_name, c.column_name,
      (SELECT k.confdeltype::text FROM pg_constraint k
       JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = ANY (k.conkey)
       WHERE k.contype = 'f' AND k.confrelid = 'neon_auth."user"'::regclass
         AND k.conrelid = format('%I.%I', c.table_schema, c.table_name)::regclass
         AND a.attname = c.column_name
       LIMIT 1) AS on_delete
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'neon_auth' AND t.table_type = 'BASE TABLE'
      AND c.column_name IN ('userId', 'user_id')
    ORDER BY c.table_name`);
  const summary = userTables.rows
    .map((row) => `${row.table_name}.${row.column_name}=${row.on_delete ?? "none"}`)
    .join(", ");
  console.log(`neon_auth user-id tables (FK delete rule to "user"): ${summary || "none"}`);
  const erased = userTables.rows.filter((row) => row.on_delete !== "c");
  if (erased.length > 0) {
    console.log(`not cascading, erase deletes: ${erased.map((row) => row.table_name).join(", ")}`);
  }

  // Before 0000 has run there is no table, and so nothing applied.
  const table = await client.query("SELECT to_regclass('schema_migrations') IS NOT NULL AS ok");
  const recorded = table.rows[0]?.ok
    ? (await client.query("SELECT name FROM schema_migrations")).rows
    : [];
  const applied = new Set(recorded.map((row) => row.name));

  if (values.down) {
    const name = values.down;
    const newest = ordered.filter((file) => applied.has(file)).at(-1);
    if (name !== newest) {
      throw new Error(
        `--down ${name} refused: only the newest applied migration (${newest ?? "none"}) reverts`,
      );
    }
    // The record goes first: reverting 0000 drops the table it lives in.
    await inTransaction(async () => {
      await client.query("DELETE FROM schema_migrations WHERE name = $1", [name]);
      await client.query(read(downFileFor(name)));
    });
    console.log(`reverted ${name}`);
  } else {
    const pending = pendingMigrations(ordered, applied);
    for (const name of pending) {
      await inTransaction(async () => {
        await client.query(read(name));
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
      });
      console.log(`applied ${name}`);
    }
    console.log(`${pending.length} migration(s) applied, ${ordered.length} on disk.`);
  }
} finally {
  client.release();
  await pool.end();
}
