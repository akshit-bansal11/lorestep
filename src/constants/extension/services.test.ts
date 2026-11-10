import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EXTENSION_SERVICES } from "./services";

// The extension is plain global JS, so the site's list cannot import it. Read the source instead.
const STATES = readFileSync(
  fileURLToPath(new URL("../../../extension/core/states.js", import.meta.url)),
  "utf8",
);

describe("EXTENSION_SERVICES", () => {
  it.each(EXTENSION_SERVICES)("%s is a platform in extension/core/states.js", (service) => {
    expect(STATES).toContain(`name: "${service}"`);
  });
});
