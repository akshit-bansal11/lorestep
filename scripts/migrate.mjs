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
