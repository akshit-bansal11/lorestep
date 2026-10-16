# Contributing

Thanks for looking. Lorestep is small on purpose; the bar for a change is that it makes the story order more useful or more correct for someone reading it, and that it passes the same gate CI runs.

## Ways to help

| You want to | Do this |
| --- | --- |
| Fix an entry that is in the wrong place, missing or wrong | [Report a wrong entry](https://github.com/akshit-bansal11/lorestep/issues/new?template=wrong-entry.yml), or send the fix as a pull request (see [Changing the data](#changing-the-data)) |
| Report something broken | [Open a bug report](https://github.com/akshit-bansal11/lorestep/issues/new?template=bug-report.yml) |
| Suggest something new | [Open a feature request](https://github.com/akshit-bansal11/lorestep/issues/new?template=feature-request.yml) |
| Report a security hole | [Open a private advisory](https://github.com/akshit-bansal11/lorestep/security/advisories/new), not an issue. See [SECURITY.md](SECURITY.md) |
| Change the code | Open an issue first for anything bigger than a fix, so the design can be talked through before code exists |

Every issue starts from a form; blank issues are off. A wrong-entry report needs a source, because story order is argued over and a source is what settles it.

## Setting up

Fork the repository on GitHub and clone your fork. Your work lives on your fork, and reaches this repository as a pull request.

```sh
git clone https://github.com/<you>/lorestep.git
cd lorestep
git remote add upstream https://github.com/akshit-bansal11/lorestep.git
npm ci
cp .env.example .env.local
```

The content pages read a Neon database when they render, so `npm run dev` and `npm run build` need `DATABASE_URL` in `.env.local`. `ITAD_API_KEY` is only needed for live prices. `.env.example` says what each variable is for. The dev server runs on port 3001. `/about` and `/docs` read nothing, so they render without a database.

## Changing the data

The games live in `src/data/franchises.json` and the films and series in `src/data/screen.json`. They are the snapshots the database is seeded from: an edit reaches the site only once it is seeded with `npm run data:seed`, which needs the production connection string, so the maintainer runs that after merging.

A franchise is one connected storyline with at least two games:

| Field | Holds |
| --- | --- |
| `id` | Lowercase, hyphenated, unique. It is the address: `/games#/<id>` |
| `name` | As the site shows it |
| `scope` | What is in and what is left out, in a sentence or two |
| `caveat` | How the order was decided. Shown under "How this order was decided"; this is where a disputed placement is argued |
| `arcs` | Optional. Named storylines that stand alone (`id`, `name`, `blurb`). If a franchise has them, every game names one, and each storyline's games sit together in the order |

Each game:

| Field | Holds |
| --- | --- |
| `id` | Unique across the whole file |
| `order` | Its place in the story, counting from 1 with no gaps |
| `arc` | The storyline it belongs to, when the franchise declares any |
| `title`, `year` | The game and its original release year |
| `version` | The edition the site recommends playing |
| `platform` | Where that version runs, such as `PC / PS5 / Switch` |
| `msrp`, `hours` | List price as text, and length in hours (or `null`) |
| `tier` | `core`, `opt` or `skip`, shown as Core, Optional and Skippable |
| `starter` | `true` for the game the franchise suggests starting with |
| `store`, `storefront`, `query` | Where to buy it (`pc`, `ps`, `xb` or `nin`), the shop's name, and the title to search prices for |
| `note` | Why it sits where it does. Shown under "Why here" |
| `editions` | Every edition worth knowing about, with exactly one marked `recommended` |

`npm run data:check` enforces the rules above: unique ids, an `order` with no gaps, known tiers and stores, exactly one recommended edition, arcs that exist and sit together. It prints every problem it finds rather than stopping at the first.

## Making a change

1. Bring your fork's `main` up to date with `upstream/main`, then branch from it.
2. Add or change a test when you add logic or a branch, or fix a bug. Unit and component tests sit next to the code as `*.test.ts(x)`; browser tests are in `e2e/`.
3. Run `npm run check` until it is clean. It formats and organises imports in place, then runs Biome, ESLint and Stylelint, the type checker, the data check and Vitest. CI runs the same checks without writing, as `npm run check:ci`, so it fails instead of quietly reformatting your pull request. `npm run test:e2e` runs the Playwright suite against a production build and needs `DATABASE_URL`. Do not suppress a lint finding to get green.
4. For a UI change, look at it in light and dark, and at phone width.
5. Commit with a [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) subject (`feat:`, `fix:`, `docs:`, `test:`, with an optional scope such as `feat(screen):`) and a body that says what changed and why.
6. Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md).
7. Push the branch to your fork and open a pull request against `main`. The template asks what changed, why, and for the checks above.

## Reviews

CI runs the gate on every pull request. The build and the browser suite need the database secret, so they run once a change reaches `main`. The maintainer reviews and merges. Expect questions on a data change without a source, and on anything that adds a dependency.

## Style

- A new dependency needs a reason in the pull request.
- Constants are named. A number that appears twice is a constant.
- Colours, radii and durations come from the tokens in `src/app/globals.css`. There is one accent colour, and it marks what is active, current or a link; every text colour passes WCAG AA against every surface in both themes.
- The browser storage keys are versioned (`/v1`) and keep their `isitcanon/` prefix. Changing one drops every visitor's saved data.

## Releases

The maintainer tags releases: bumping `package.json`, moving **Unreleased** into a dated section, and pushing a `v<version>` tag, which the release workflow turns into a GitHub Release. A pull request does not bump the version or tag. A merged change is live as soon as Vercel deploys `main`, and is named in the next release.
