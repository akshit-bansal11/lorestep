import { base64url, generateKeyPair, type JWTPayload, SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { verifyExtensionToken } from "@/lib/auth/verify-extension-token";
import type { ExtensionTokenDeps } from "@/types/auth/auth";

const ISSUER = "https://ep-test.neonauth.test";
const AUDIENCE = "https://lorestep.test/api/v1/sync";
const CLIENT_ID = "extension-client";
const USER_ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let deps: ExtensionTokenDeps;

const claims = (): JWTPayload => ({ client_id: CLIENT_ID, sub: USER_ID });

function sign(payload: JWTPayload, edit: (jwt: SignJWT) => SignJWT = (jwt) => jwt) {
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: "EdDSA" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("1h");
  return edit(jwt).sign(keys.privateKey);
}

async function expectStatus(
  token: string,
  status: number,
  override: Partial<ExtensionTokenDeps> = {},
) {
  const result = verifyExtensionToken(token, { ...deps, ...override });
  await expect(result).rejects.toMatchObject({ status });
}

describe("verifyExtensionToken", () => {
  beforeAll(async () => {
    keys = await generateKeyPair("EdDSA");
    deps = {
      getKey: () => keys.publicKey,
      issuer: ISSUER,
      audience: AUDIENCE,
      clientId: CLIENT_ID,
    };
  });

  it("returns the sub of a valid token", async () => {
    await expect(verifyExtensionToken(await sign(claims()), deps)).resolves.toBe(USER_ID);
  });

  it("rejects a wrong issuer", async () => {
    await expectStatus(await sign(claims(), (jwt) => jwt.setIssuer("https://evil.test")), 401);
  });

  it("rejects a wrong audience", async () => {
    await expectStatus(
      await sign(claims(), (jwt) => jwt.setAudience("https://lorestep.test")),
      401,
    );
  });

  it("rejects a token for another client", async () => {
    await expectStatus(await sign({ ...claims(), client_id: "other" }), 401);
  });

  it("rejects an expired token", async () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    await expectStatus(await sign(claims(), (jwt) => jwt.setExpirationTime(past)), 401);
  });

  it("rejects a sub that is not a uuid", async () => {
    await expectStatus(await sign({ ...claims(), sub: "user-1" }), 401);
  });

  it("rejects an empty token", async () => {
    await expectStatus("", 401);
  });

  it("rejects alg none", async () => {
    const part = (value: object) => base64url.encode(JSON.stringify(value));
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const body = { ...claims(), iss: ISSUER, aud: AUDIENCE, exp };
    await expectStatus(`${part({ alg: "none" })}.${part(body)}.`, 401);
  });

  it("rejects an HS256 token", async () => {
    const secret = new TextEncoder().encode("a-shared-secret-of-at-least-32-bytes!");
    const token = await new SignJWT(claims())
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime("1h")
      .sign(secret);
    await expectStatus(token, 401, { getKey: () => secret });
  });

  it("rejects an RS256 token", async () => {
    const rsa = await generateKeyPair("RS256");
    const token = await new SignJWT(claims())
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime("1h")
      .sign(rsa.privateKey);
    await expectStatus(token, 401, { getKey: () => rsa.publicKey });
  });

  it("answers 503 when the JWKS cannot be fetched", async () => {
    const getKey = () => Promise.reject(new TypeError("fetch failed"));
    await expectStatus(await sign(claims()), 503, { getKey });
  });
});
