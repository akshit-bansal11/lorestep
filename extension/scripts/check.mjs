// Lorestep for Chrome quality gate. Plain Node, no dependencies; runs in CI (`npm run check`).
//  1. Every JS file parses.
//  2. Every file the manifest names exists, and it grants only the permissions listed in ALLOWED.
//  3. Content-script hosts match core/states.js PLATFORMS exactly, and each bundle loads in order.
//  4. No markup-parsing or code-evaluating sinks anywhere in the shipped code.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const problems = [];
const fail = (msg) => problems.push(msg);
const LORESTEP_ORIGIN = "https://lorestep.akshitbansal.dev";
const NEON_AUTH_ORIGIN = "https://ep-noisy-king-bbgaaffj.neonauth.c-15.us-east-1.aws.neon.tech";

const walk = (dir) =>
  !existsSync(dir)
    ? []
    : readdirSync(dir).flatMap((name) => {
        const p = join(dir, name);
        if (name === "node_modules" || name.startsWith(".")) return [];
        return statSync(p).isDirectory() ? walk(p) : [p];
      });

const shipped = [...["core", "adapters", "library"].flatMap((d) => walk(join(root, d))), join(root, "background.js")];
const js = [...shipped, ...walk(join(root, "tests")), ...walk(join(root, "scripts"))].filter((f) =>
  /\.(m?js)$/.test(f),
);

// 1. syntax
for (const f of js) {
  try {
    execFileSync(process.execPath, ["--check", f], { stdio: "pipe" });
  } catch (err) {
    fail(`${relative(root, f)} does not parse:\n${err.stderr}`);
  }
}

// 2. manifest
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const named = [
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
  manifest.action?.default_popup,
  manifest.background?.service_worker,
  ...manifest.content_scripts.flatMap((c) => [...(c.js ?? []), ...(c.css ?? [])]),
].filter(Boolean);
for (const f of named) if (!existsSync(join(root, f))) fail(`manifest.json names ${f}, which does not exist`);
// storage: the list. contextMenus: right-click marking under sites' hover cards. alarms: the
// periodic Lorestep pull and sync retries (signed out, the alarm is cleared). identity:
// launchWebAuthFlow for the Lorestep OAuth sign-in (core/auth.js).
const ALLOWED = '["storage","contextMenus","alarms","identity"]';
if (JSON.stringify(manifest.permissions) !== ALLOWED)
  fail(`permissions must be exactly ${ALLOWED}, got ${JSON.stringify(manifest.permissions)}`);
if (manifest.background && Object.keys(manifest.background).join() !== "service_worker")
  fail("background may only declare a classic service_worker");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (pkg.version !== manifest.version)
  fail(`package.json version ${pkg.version} != manifest version ${manifest.version}`);
// The sync host and its OAuth provider. Only the service worker may fetch them; content scripts never do.
const HOSTS = JSON.stringify([`${LORESTEP_ORIGIN}/*`, `${NEON_AUTH_ORIGIN}/*`]);
if (JSON.stringify(manifest.host_permissions) !== HOSTS)
  fail(`host_permissions must be exactly ${HOSTS}, got ${JSON.stringify(manifest.host_permissions)}`);
// The pinned public key keeps the unpacked id (and so the chromiumapp.org redirect URI) stable.
// The value is public, but never printed: the failure names only the problem.
if (typeof manifest.key !== "string" || !/^[A-Za-z0-9+/]{200,}={0,2}$/.test(manifest.key))
  fail("manifest.json key is missing or is not a base64 public key");
for (const k of ["optional_host_permissions", "web_accessible_resources", "externally_connectable"]) {
  if (k in manifest) fail(`manifest.json declares ${k}; the extension needs none of it`);
}

// 3. hosts and bundle order
globalThis.Lorestep = undefined;
await import(pathToFileURL(join(root, "core/states.js")).href);
const D = globalThis.Lorestep;
const expected = new Set(Object.values(D.PLATFORMS).flatMap((p) => p.hosts));
const declared = new Set(
  manifest.content_scripts.flatMap((c) => c.matches.map((m) => new URL(m.replace("/*", "/")).hostname)),
);
for (const h of expected) if (!declared.has(h)) fail(`PLATFORMS host ${h} has no content_scripts match`);
for (const h of declared) if (!expected.has(h)) fail(`content_scripts matches ${h}, which PLATFORMS does not list`);
for (const c of manifest.content_scripts) {
  const order = c.js.join(",");
  if (!/^core\/states\.js,core\/store\.js,core\/ui\.js,adapters\/[a-z0-9]+\.js,core\/scan\.js$/.test(order)) {
    fail(`content script bundle loads in the wrong order or with extra files: ${order}`);
  }
  if (c.matches.some((m) => !m.startsWith("https://"))) fail(`non-https match in ${c.matches}`);
}

// 4. dangerous sinks
const SINKS =
  /\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\s*\(|new\s+Function|setTimeout\s*\(\s*["'`]|setInterval\s*\(\s*["'`])/;
for (const f of shipped.filter((f) => /\.(js|html)$/.test(f))) {
  readFileSync(f, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (SINKS.test(line)) fail(`${relative(root, f)}:${i + 1} uses a markup or code sink: ${line.trim()}`);
    });
}
for (const f of shipped.filter((f) => f.endsWith(".html"))) {
  if (/<script(?![^>]*\ssrc=)[^>]*>/i.test(readFileSync(f, "utf8")))
    fail(`${relative(root, f)} has an inline <script>`);
}

if (problems.length) {
  console.error(`check failed (${problems.length}):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`check passed: ${js.length} JS files, ${named.length} manifest paths, ${expected.size} hosts`);
