# Changelog

All notable changes to Lorestep. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Lorestep is a website rather than something you install, so a version marks a state of the deployed site.

## [Unreleased]

### Added

- **A logo.** A staircase climbing left to right with a marker above the top step, as the favicon, in the README, and on a social preview card that link previews now show.
- **A header on every page**, with the logo, the sections, the current one marked, and the light/dark switch, which until now only existed in the games view.
- **Issue forms** for a wrong or missing entry, a bug and a feature, and a pull request template. Blank issues are off, and security reports are pointed to a private advisory.
- CONTRIBUTING gains a field-by-field guide to the data.

### Changed

- **The site lives at lorestep.akshitbansal.me.** Its canonical address, sitemap, `robots.txt` and link-preview card all name it, and is-it-canon.vercel.app redirects to it, path for path, whenever that host is attached to the project.
- **A warm palette with one accent colour**, in both themes. The accent marks what is active, current or a link, and the focus ring is drawn in it.
- **A new home page**: a headline and the two ways in, the dataset's counts up front, the three sections, and a three-step "how it works".
- **Chronologies read as a timeline**: a rail through numbered stops that light up on hover, with placement notes set in from it.
- The light/dark switch shows a sun or a moon rather than a half-filled circle.

### Fixed

- The empty Books card on the home page faded its text to 60% opacity, below WCAG AA contrast. It is drawn with a dashed border instead.
- On a phone, the games toolbar's filters could not wrap and pushed the whole page sideways.

## [0.2.0] - 2026-10-16

### Added

- **An MIT licence.**
- **A canonical home, lorestep.vercel.app.** The site now declares its origin (`metadataBase`), carries an Open Graph card for shared links, and serves `robots.txt` and a sitemap listing every section and every chronology.
- **An About page** (`/about`): what the site is, how its story order is decided, what it does not do, and where its data comes from.
- **A Docs page** (`/docs`): using the site, the keyboard shortcuts, where the data comes from, how to report a wrong entry, and a section for developers.
- **A footer** on every page but the games view, linking About, Docs, GitHub and the licence. The games header links About and Docs.
- CHANGELOG, CONTRIBUTING and SECURITY.
- **A release workflow.** Pushing a `v*` tag checks the tag against `package.json`, takes that version's section of this file as the notes, and publishes a GitHub Release.

### Changed

- **Renamed to Lorestep.** The name had been written three ways: `is-it-canon`, `isitcanon` and `canonlogy`. The browser storage keys keep their `isitcanon/` prefix, so the progress, prices and theme you saved before the rename are still there after it.
- **is-it-canon.vercel.app redirects to lorestep.vercel.app**, path for path, with a permanent redirect. A link into the games view keeps its place, since the part after `#` survives the redirect.
- The README leads with what the site is for; the developer material follows it.

## [0.1.0] - 2026-09-09

The site as it stood before the rename, under the name isitcanon.

### Added

- **Games.** 126 franchises, 690 games and 104 storylines, each in story order. A grid of every franchise is the front door, a searchable sidebar switches between them, and `Cmd/Ctrl K` jumps to any series or game. Franchises that split into separate storylines, such as Assassin's Creed or Zelda's branching timeline, are broken into sections that can be filtered to one.
- **Tracking.** Play status, device and store per game, kept in the browser and shared between open tabs. Clearing a game's status clears its device and store with it.
- **A game's detail panel**, with its editions and notes.
- **The view in the URL** (`/games#/witcher`), so a reload keeps your place and a link points at one series.
- **Prices from IsThereAnyDeal** for the rows in view, cached in the browser and refreshed in the background once the cache is 30 minutes old. Console rows keep their authored price, because IsThereAnyDeal covers PC storefronts only.
- **Movies & Series.** Six chronologies and 322 titles, with placement notes that set a run of episodes against the films around it.
- **Books**, listed and honestly empty: no dataset has been written.
- A landing page whose section counts are read from the database.
- Light and dark themes, a reduced-motion mode, and keyboard shortcuts for the games view.
- Release years, runtimes, ratings and prices for the original 12 franchises (72 games), pulled from IsThereAnyDeal and IGDB. The 114 franchises added later were written by hand and are not API-checked.

[Unreleased]: https://github.com/akshit-bansal11/lorestep/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/akshit-bansal11/lorestep/compare/542c110...v0.2.0
[0.1.0]: https://github.com/akshit-bansal11/lorestep/tree/542c110
