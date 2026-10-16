#!/usr/bin/env node
// Asserts that the content routes were prerendered, and that the only route
// rendered per request is the price API.
//
// Reads .next/prerender-manifest.json rather than grepping the route table
// `next build` prints. That table is formatted for a human terminal: in CI it is
// not a TTY, the box-drawing glyphs it uses do not survive a pipe, and an
// assertion built on them fails against a build that is perfectly fine. This was
// not hypothetical — the first version of this check did exactly that and
// reported all three content routes as broken while the build was correct.
//
// Usage: node scripts/check-static.mjs   (after `npm run build`)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MANIFEST = fileURLToPath(new URL("../.next/prerender-manifest.json", import.meta.url));

// The reason for the whole build-time read: visitors must not pay for a
// database round trip. A route dropping off this list means something started
// opting out of caching, which nothing in the source will tell you.
const MUST_BE_PRERENDERED = [
  "/",
  "/games",
  "/screen",
  "/books",
  "/about",
  "/docs",
  "/screen/mcu",
  "/screen/star-wars",
  "/screen/dceu",
  "/screen/dcu",
  "/screen/lord-of-the-rings",
  "/screen/marvel-chronology",
];

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch (error) {
  console.error(`Could not read ${MANIFEST}. Run \`npm run build\` first.`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const prerendered = new Set(Object.keys(manifest.routes ?? {}));
let failed = false;

for (const route of MUST_BE_PRERENDERED) {
  const ok = prerendered.has(route);
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} prerendered  ${route}`);
}

// The price route talks to a third-party API per request and is meant to be
// dynamic. If it ever appears here it has been silently cached, which would
// serve stale prices.
if (prerendered.has("/api/prices")) {
  failed = true;
  console.log("FAIL /api/prices is prerendered; it must stay dynamic");
} else {
  console.log("ok   dynamic      /api/prices");
}

if (failed) {
  console.error("\nStatic generation regressed.");
  console.error(`Prerendered routes were: ${[...prerendered].sort().join(", ")}`);
  process.exit(1);
}
console.log("\nAll content routes are prerendered.");
