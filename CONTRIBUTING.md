# Contributing

Thanks for looking. Lorestep is small on purpose; the bar for a change is that it makes the story order more useful or more correct for someone reading it, and that it passes the same gate CI runs.

## Before you start

- **A wrong entry is worth an issue on its own.** A game in the wrong place, a missing title, a wrong year: [open an issue](https://github.com/akshit-bansal11/lorestep/issues/new) naming the franchise, the entry, and a source for the order you expect.
- Open an issue for anything bigger than a fix, so the design can be talked through before code exists.

## Setting up

Fork the repository on GitHub and clone your fork. Your work lives on your fork, and reaches this repository as a pull request.

```sh
git clone https://github.com/<you>/lorestep.git
cd lorestep
git remote add upstream https://github.com/akshit-bansal11/lorestep.git
npm ci
cp .env.example .env.local
```

The content pages read a Neon database when they render, so `npm run dev` and `npm run build` need `DATABASE_URL` in `.env.local`. `ITAD_API_KEY` is only needed for live prices. `.env.example` says what each variable is for. The dev server runs on port 3001.

## Making a change

1. Bring your fork's `main` up to date with `upstream/main`, then branch from it.
2. Data lives in `src/data/franchises.json` and `src/data/screen.json`. An edit there must pass `npm run data:check`, and reaches the site only once it is seeded into the database with `npm run data:seed`, which needs the production connection string.
3. Add or change a test when you add logic or a branch, or fix a bug.
4. Run `npm run check` until it is clean. It formats and organises imports in place, then runs Biome, ESLint and Stylelint, the type checker, the data check and Vitest. CI runs the same checks without writing, as `npm run check:ci`, so it fails instead of quietly reformatting your pull request. `npm run test:e2e` runs the Playwright suite against a production build and needs `DATABASE_URL`. Do not suppress a lint finding to get green.
5. Commit with a [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) subject (`feat:`, `fix:`, `docs:`, `ci:`, with an optional scope such as `feat(screen):`) and a body that says what changed and why.
6. Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md).
7. Push the branch to your fork and open a pull request against `main`.

## Style

- A new dependency needs a reason in the pull request.
- Constants are named. A number that appears twice is a constant.
- Colours, radii and durations come from the tokens in `src/app/globals.css`, in both themes.
- The browser storage keys are versioned (`/v1`) and keep their `isitcanon/` prefix. Changing one drops every visitor's saved data.

## Releases

The maintainer tags releases. A pull request does not bump the version or tag; a merged change ships in the next one.
