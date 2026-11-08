# Decisions

Append only (`.claude/CLAUDE.md` section 19). Context / options / choice / consequence / revisit when.

## 2026-11-08 Migrations are plain SQL run by a script

- Context: user tables need migrations that survive schema changes; `seed-db.mjs` drops and
  rebuilds the catalog tables, so it cannot own them.
- Options: drizzle-kit `generate` + `migrate`; plain SQL files with a small runner.
- Choice: `db/migrations/NNNN_name.sql` + `NNNN_name.down.sql`, applied by `scripts/migrate.mjs`,
  tracked in `schema_migrations`. drizzle-kit rejected: `generate` needs a local node run, which is
  forbidden here, and hand-written snapshots drift.
- Consequence: `src/lib/db/schema.ts` is kept in step with the SQL by hand; only the CI e2e run
  catches drift. Each file runs in one transaction with its record, over the Neon WebSocket `Pool`
  (neon-http has no transactions and one statement per request). `--down` reverts only the newest
  applied migration.
- Revisit when: schema drift between SQL and `schema.ts` causes a real bug, or local node runs
  become possible.

## 2026-11-08 Migration helpers live in TypeScript under src/

- Context: the ordering and validation helpers must be unit-tested by Vitest and typechecked, and
  `tsconfig.json` has `allowJs: false`, so a test cannot import them from `scripts/migrate.mjs`.
- Options: export them from the `.mjs` plus a hand-written `.d.ts`; a `.ts` module the script imports.
- Choice: `src/lib/db/migrate-order.ts`, imported by the script through Node's type stripping
  (erasable syntax only, no imports).
- Consequence: the file must stay free of enums, namespaces, parameter properties and `@/` imports.
- Revisit when: the script needs a non-erasable TypeScript feature.
