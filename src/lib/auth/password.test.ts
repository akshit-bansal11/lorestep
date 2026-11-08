import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

// Real Argon2id at the production cost (SEC-05 forbids lowering it): few hashes, not cheap ones.
describe("password hashing", () => {
  const password = "correct horse battery staple";

  it("hashes with Argon2id at 64 MiB, t=3, p=1 and a fresh salt, and verifies", async () => {
    const [first, second] = await Promise.all([hashPassword(password), hashPassword(password)]);

    expect(first).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=1\$[\w+/]{22}\$[\w+/]{43}$/);
    expect(first).not.toBe(second);
    expect(await verifyPassword({ hash: first, password })).toBe(true);
    expect(await verifyPassword({ hash: first, password: `${password}!` })).toBe(false);
  });

  it("never verifies a malformed or foreign hash", async () => {
    for (const hash of ["", "plain", "$argon2i$v=19$m=65536,t=3,p=1$abc$def", "$2b$10$abcdef"]) {
      expect(await verifyPassword({ hash, password })).toBe(false);
    }
  });
});
