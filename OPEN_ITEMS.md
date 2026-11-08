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
