# Open items

Register: deferred, accepted, unprovisioned. Delete an entry when it closes.

## Unprovisioned

- `DATABASE_URL_CI` GitHub secret (Neon CI branch, PLAN.md section 9 step 1). Until it exists the
  CI e2e job skips every step with a notice: no browser tests run, and the migration runner has
  never executed. Closes when a push to `main` shows the e2e job migrating, seeding and passing.
- GitHub Environment `production` with a required reviewer. `.github/workflows/migrate.yml` names it,
  and that line enforces nothing until it exists. Closes when the environment is checked in the
  repository settings, not the YAML.

## Deferred

- CI and `migrate.yml` run Node 24, whose support ended 2026-10-20 (CI-D03 wants 26). Out of M1's
  scope. Closes when every workflow's `node-version` is an Active LTS release.

## Accepted

- R1: `sessions.token` is stored raw, against DB-15. The current Better-Auth docs (session and
  options references, read 2026-11-08) offer no hashed session-token storage; they do offer
  `verification.storeIdentifier: "hashed"` and `account.encryptOAuthTokens`. Mitigation per
  PLAN.md section 11 Q2 lands in M3: signed tokens only (`bearer({ requireSignature: true })` and
  the signed cookie), so a database read alone cannot authenticate. Closes when Better-Auth ships
  session-token hashing and it is enabled.
