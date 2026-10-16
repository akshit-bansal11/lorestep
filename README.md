<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/lorestep-dark.svg"><img src="assets/lorestep-light.svg" width="96" alt="Lorestep"></picture></p>

# Lorestep

Lorestep puts connected franchises in story order: what to play, watch and read in in-universe chronology rather than the order things were released. Every entry sits where it falls in the story, with the branches and side paths marked, and the progress you track through a franchise stays in your own browser — there is no account.

[![CI](https://github.com/akshit-bansal11/lorestep/actions/workflows/ci.yml/badge.svg)](https://github.com/akshit-bansal11/lorestep/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Site](https://img.shields.io/badge/site-lorestep.vercel.app-black.svg)](https://lorestep.vercel.app)

**Open it at [lorestep.vercel.app](https://lorestep.vercel.app).**

## What it covers

Three sections:

| Section | Route | Holds |
| --- | --- | --- |
| **Games** | `/games` | 126 franchises, 690 games, 104 storylines |
| **Movies & Series** | `/screen` | 6 chronologies, 322 titles, 29 blocks |
| **Books** | `/books` | nothing yet — no dataset has been written |

**Games.** Every franchise here has at least two games sharing one storyline; the ones that split into separate storylines — Assassin's Creed, Zelda's branching timeline, Mega Man's far-future chain — declare those splits and the table breaks into sections for them. The front door is a grid of every franchise. Pick one and you get its table: one row per game, in story order, with three fields you set yourself — play status, the device you play it on, and the store you own it from — all held in the browser. A searchable sidebar switches franchises, `Cmd/Ctrl K` jumps straight to any series or game, and clicking a game title opens a detail panel with its editions and notes.

The current view lives in the URL (`/games#/witcher`, `/games#/ac/desmond`), so a reload keeps your place and a link points at one series.

**Movies & Series.** Watch orders across films and series. Where a chronology interleaves a series with the films around it, that placement is its own line rather than being folded into a title — those markers carry the ordering's reasoning and are counted separately from things you actually watch.

**Books** is listed but empty. No dataset exists, and rather than show invented titles the section says so.

## Keyboard

| Key | Does |
| --- | --- |
| `Cmd/Ctrl K` | Jump to any franchise or game |
| `/` | Focus the franchise filter |
| `[` / `]` | Previous / next franchise |
| `G` | Back to the franchise grid |
| `Esc` | Close an overlay, or clear the filter |
| `?` | Show the shortcut list |

---

Everything below is for working on the code.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript (strict, `noUncheckedIndexedAccess`)
- Tailwind CSS v4
- Neon (serverless Postgres) + Drizzle ORM
- Better Stack (errors, logs, uptime) + Vercel Web Analytics
- Biome (format + lint), ESLint (flat config), Stylelint
- Vitest

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server on port 3001 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run format` | Biome format, writes in place |
| `npm run imports` | Biome import organization, writes in place |
| `npm run lint:js` | Biome lint + ESLint, zero warnings allowed |
| `npm run lint:js:fix` | Same, autofixing what it can |
| `npm run lint:css` | Stylelint over all CSS |
| `npm run lint:css:fix` | Same, autofixing what it can |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest, single run (unit + component) |
| `npm run test:e2e` | Playwright end-to-end suite (builds and serves production) |
| `npm run test:e2e:ui` | Playwright in UI mode |
| `npm run data:enrich` | Repopulate the dataset from ITAD + IGDB |
| `npm run data:check` | Structural checks over the games JSON (ids, ordering, arcs) |
| `npm run data:seed` | Create the Neon tables and load both snapshots, then verify |
| `npm run check` | format, lint:js, lint:css, typecheck, data:check, test in sequence |
| `npm run check:ci` | same checks, non-mutating — what CI runs |

## Layout

```txt
src/
├── app/
│   ├── (site)/          # every document-flow page, sharing the footer layout
│   │   ├── about/       # what it is, how order is decided, sources
│   │   ├── books/       # honest empty state
│   │   ├── docs/        # usage, shortcuts, data, reporting, developers
│   │   ├── screen/      # chronology index and one page per chronology
│   │   ├── layout.tsx   # adds the footer; the games shell sits outside it
│   │   └── page.tsx     # landing page
│   ├── api/prices/      # ITAD price lookup route handler
│   ├── games/           # the canon tracker, a fixed full-height shell
│   ├── globals.css      # monochrome token spine, motion scale, both themes
│   ├── icon.svg         # favicon
│   ├── layout.tsx       # root metadata: metadataBase, Open Graph
│   ├── opengraph-image.png  # the link-preview card, same as assets/social-preview.png
│   ├── robots.ts
│   └── sitemap.ts       # static routes plus one entry per chronology
├── components/
│   ├── canon/           # shell, sidebar, grid, table, drawer, palette, cells
│   ├── screen/          # chronology timeline
│   └── site/            # section cards, footer, prose sections, analytics provider
├── constants/
│   ├── site.ts          # canonical URL, name, description, routes, site links
│   ├── docs/            # the docs page's table of contents
│   └── canon/           # columns, statuses, devices, storefronts, tiers, filters, motion
├── data/
│   ├── franchises.json  # games snapshot; seeds Neon, not read at runtime
│   └── screen.json      # movies and series snapshot, same role
├── hooks/
│   └── canon/           # tracked entries, theme, prices, hotkeys, chunked rendering
├── lib/
│   ├── db/              # Neon client, Drizzle schema, and the app's three reads
│   └── observability/   # Better Stack token presence
├── types/
│   └── canon/           # franchise, game, arc, table, user, price, theme, view types
└── utils/
    └── canon/           # pure helpers + the localStorage stores
assets/                  # logo (light and dark) and the GitHub social preview
e2e/                     # Playwright specs (table, tracking, filters, editions, screen, a11y, site)
scripts/                 # enrich-data.mjs, check-data.mjs, cache and report
```

## Routes

| Route | Rendering |
| --- | --- |
| `/` | static, revalidated hourly — section cards with counts read from the database |
| `/games` | static, revalidated hourly |
| `/screen` | static, revalidated hourly |
| `/screen/[slug]` | SSG, one prerendered page per chronology |
| `/books` | static |
| `/about` | static |
| `/docs` | static |
| `/api/prices` | dynamic — the only route rendered on demand, by design |

`npm run build` prints this table. It is worth reading rather than skimming: a content route showing as `ƒ` means it has silently started hitting the database per visitor. CI asserts against exactly that.

## Data

The dataset — 126 franchises, 690 games, 104 storylines — lives in **Neon** (serverless Postgres). `src/lib/db/schema.ts` defines the tables through Drizzle; `src/lib/db/queries.ts` holds the three reads the app makes.

`src/data/franchises.json` and `src/data/screen.json` are the authored snapshots the database is seeded from, and are still what `npm run data:check` and the enrichment scripts operate on. They are **not** what the app reads at runtime.

```bash
npm run data:seed    # creates the tables and loads both snapshots
```

That script replaces rather than merges, because the JSON files are complete snapshots and a partial update would strand rows deleted upstream. It reads back afterwards and asserts every count against the authored files, plus orphaned franchise and arc references — an import exiting zero is not evidence it moved everything. Orphans matter because they are silent: a game whose `franchise_id` or `arc` matches nothing simply stops appearing, with no error anywhere.

The schema is created by that script rather than by drizzle-kit migrations. The dataset is a snapshot that is always reseeded whole, so there is no state to migrate between versions. If this ever grows per-user rows that must survive a schema change, that stops being true and drizzle-kit earns its place.

`src/data/screen.json` carries two deliberate decisions. Entries with `kind: "marker"` are not watchable — they place a run of episodes against the films around them ("AoS S1 Ep 1–7 · Before Thor: The Dark World") — and are excluded from title counts. `type: null` means the source never said whether something was a film or a series; it means unknown, not "other".

`npm run data:check` validates the games JSON for what types cannot catch: duplicate ids, an `order` that skips a number, a game naming an arc its franchise never declared, a storyline split into non-adjacent blocks.

A franchise may declare `arcs` — named storylines that stand alone within it. Every game then carries an `arc` matching one of them, and the games of each arc sit together in the ordering. Franchises that tell one continuous story simply omit both fields.

The content pages are server components that read the database at build time and revalidate hourly, so the dataset is editable without a redeploy while the page stays statically generated. Filtering, sorting and search all still run on the client against the full dataset — that is what keeps the table instant, and it is why the read query returns everything rather than paginating.

Three things are written to `localStorage`: your input (status, device and store per game, under `isitcanon/entries/v1`), the fetched price cache (`isitcanon/prices/v1`), and the theme choice (`isitcanon/theme/v1`). The keys keep the `isitcanon/` prefix from before the rename on purpose: they are never shown, and changing them would drop every visitor's saved progress. All are exposed through `useSyncExternalStore`, so two open tabs stay in sync. Clearing a game's status clears its device and store with it.

## Deployment

Vercel, with the default Next build. The only variable the build needs is **`DATABASE_URL`**, because the home, games and screen pages read the database at build time — a build without it fails by design rather than producing an empty site.

`ITAD_API_KEY` is needed at runtime for the price route.

## Observability

Errors and logs go to **Better Stack**; traffic goes to **Vercel Web Analytics**.

| Variable | For |
| --- | --- |
| `NEXT_PUBLIC_BETTER_STACK_ERRORS_TOKEN` | error reporting (a public application token) |
| `NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN`, `NEXT_PUBLIC_BETTER_STACK_INGESTING_URL` | logs, via `@logtail/next` |

Both are **inert until set** — a missing token means "not reporting", never a crash or a stream of failed calls from a visitor's browser, so local runs and CI stay silent without production credentials.

Errors arrive through a remote script rather than an npm package. That is Better Stack's own design: `b.js` is generated per application and always carries current configuration, so the snippet never needs updating. It loads `afterInteractive` — error reporting is not needed to render, and blocking first paint on it would make the monitoring worse than the problems it reports. The snippet queues anything thrown before the script lands, so early errors are not lost.

Web analytics needs no variable and no account: Vercel Web Analytics is enabled by the platform and is a no-op off Vercel. It replaced PostHog because it can be read back through the Vercel API, where a dashboard-minted analytics key cannot, and because most projects here have no product-analytics question that justifies a third-party script.

Uptime monitoring and a deploy heartbeat live in Better Stack rather than in this repo — they need no code, and they check the thing a build cannot: that the site is still answering a week after it shipped.

## CI

`.github/workflows/ci.yml`. The `check` job runs lint, types, data validation and unit tests with no secrets. The `build` job runs on pushes only, using the `DATABASE_URL` secret, because the content pages read the database at build time. It asserts that `/`, `/games` and `/screen` are still statically generated.

`.github/workflows/release.yml` runs on a `v*` tag. It fails unless the tag matches the `package.json` version, takes that version's section of `CHANGELOG.md` as the notes, and publishes a GitHub Release. Nothing is built or attached: Vercel deploys the site from `main`, so a release only names and dates a point in that history.

`drizzle-kit` carries four moderate advisories through deprecated `@esbuild-kit/*` packages. The latest stable release is inside the affected range and only `1.0.0-rc.*` escapes it, so it is accepted rather than pinned to a release candidate: `npm ls --omit=dev` confirms none of it is reachable from the production tree.

## Motion

Durations, easings and a radius scale live as custom properties in `globals.css`. Every duration is `calc(<ms> * var(--motion-scale))`, and `prefers-reduced-motion` sets that scale to `0` — one switch turns off every entrance, stagger and transition without an `!important` reset anywhere. The two looping animations (the pulse and the skeleton sweep) are switched off explicitly in the same query, since a zero-duration infinite animation is not the same as a stopped one.

Long lists arrive in chunks of 60 rather than in one commit, so a 690-row table paints immediately and the entrance animations do not stutter. Only the first two dozen rows carry a stagger delay.

## Prices

`Update data` fetches current best prices from [IsThereAnyDeal](https://isthereanydeal.com) for the rows currently in view (up to 60). It needs an API key:

```sh
cp .env.example .env.local   # then fill in ITAD_API_KEY
```

Without the key the button reports that it is missing rather than failing silently.

Prices are cached in `localStorage` and rendered instantly on load, then refreshed in the background when the site is opened — but only if the cache has aged past `PRICE_TTL_MS` (30 minutes, in `src/utils/canon/price-freshness.ts`). Without that guard every reload fires a burst of lookups and earns a 429, which costs you the prices you already had. `Update data` ignores the guard and always refetches the rows in view.

The route throttles itself to 4 concurrent lookups and retries once on a 429 before reporting the rate limit to you, rather than returning an empty result that looks like "no prices found".

## Dataset enrichment

Only the original 12 franchises (72 games) have been through enrichment. The 114 franchises added in v2 carry hand-authored years, lengths and prices with no `sources`/`market`/`igdb` block — accurate to the best of the author's knowledge, but not API-verified. A full re-run over 690 games has not been attempted; see `DEV-TASKS.md`.

`npm run data:enrich` repopulates `src/data/franchises.json` from the live APIs — ITAD for prices and historical lows, IGDB for release years, ratings, genres and time-to-beat. It is idempotent, caches raw responses under `scripts/.cache/`, and writes a reviewable old-to-new diff to `scripts/enrich-report.md`. Hand-authored values are preserved under each game's `authored` block, so a re-run is always comparable. Pass `--refresh` to bypass the cache.
