import { describe, expect, it } from "vitest";

import { signSessionToken } from "@/lib/auth/sign-session-token";

const SECRET = "test-secret-at-least-32-characters-long";
const TOKEN = "Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56";

/**
 * better-call 1.4.5 `getSignedCookie` + `verifySignature`, step for step (the check that turns the
 * bearer plugin's injected cookie into a session): split on the last dot, a 44-character signature
 * ending in `=`, then WebCrypto HMAC-SHA256 over the token.
 */
async function verifyLikeBetterCall(value: string, secret: string): Promise<string | null> {
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const token = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (signature.length !== 44 || !signature.endsWith("=")) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const bytes = Uint8Array.from(atob(signature), (char) => char.charCodeAt(0));
  const valid = await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(token));
  return valid ? token : null;
}

describe("signSessionToken", () => {
  it("round-trips through the signed-cookie verification the bearer plugin relies on", async () => {
    const signed = signSessionToken(TOKEN, SECRET);
    expect(signed.startsWith(`${TOKEN}.`)).toBe(true);
    await expect(verifyLikeBetterCall(signed, SECRET)).resolves.toBe(TOKEN);
  });

  it("fails verification under another secret or a tampered token", async () => {
    const signed = signSessionToken(TOKEN, SECRET);
    await expect(verifyLikeBetterCall(signed, `${SECRET}x`)).resolves.toBeNull();
    await expect(verifyLikeBetterCall(`x${signed.slice(1)}`, SECRET)).resolves.toBeNull();
  });

  it("leaves a raw token without a dot, which requireSignature refuses", () => {
    expect(TOKEN.includes(".")).toBe(false);
    expect(signSessionToken(TOKEN, SECRET).split(".")).toHaveLength(2);
  });
});
