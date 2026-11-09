import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE } from "@/app/api/v1/account/route";
import { HttpError } from "@/lib/http/http-error";

const { requireSessionAccount, rateLimit, assertSameOrigin, eraseAccount } = vi.hoisted(() => ({
  requireSessionAccount: vi.fn(),
  rateLimit: vi.fn(),
  assertSameOrigin: vi.fn(),
  eraseAccount: vi.fn(),
}));

vi.mock("@/lib/auth/require-session-account", () => ({ requireSessionAccount }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/http/assert-same-origin", () => ({ assertSameOrigin }));
vi.mock("@/services/account/erase", () => ({ eraseAccount }));

const ACCOUNT = { userId: "user-a", email: "a@example.com", name: "A" };

const erase = (body: unknown) =>
  DELETE(
    new NextRequest("https://lorestep.test/api/v1/account", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("DELETE /api/v1/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSessionAccount.mockResolvedValue(ACCOUNT);
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
    eraseAccount.mockResolvedValue(undefined);
  });

  it("erases the caller's account with the typed email and answers 204", async () => {
    const response = await erase({ confirm: " a@example.com " });

    expect(response.status).toBe(204);
    expect(assertSameOrigin).toHaveBeenCalledTimes(1);
    expect(eraseAccount).toHaveBeenCalledWith(ACCOUNT, "a@example.com");
  });

  it("answers 401 for a bearer token or no session and erases nothing", async () => {
    requireSessionAccount.mockRejectedValueOnce(new HttpError(401, "unauthorized", "Sign in."));

    expect((await erase({ confirm: "a@example.com" })).status).toBe(401);
    expect(eraseAccount).not.toHaveBeenCalled();
  });

  it("answers 503 when Neon Auth is unavailable", async () => {
    requireSessionAccount.mockRejectedValueOnce(new HttpError(503, "auth_unavailable", "Down."));

    expect((await erase({ confirm: "a@example.com" })).status).toBe(503);
    expect(eraseAccount).not.toHaveBeenCalled();
  });

  it("answers 400 for a missing, empty or extra-field confirm", async () => {
    expect((await erase({})).status).toBe(400);
    expect((await erase({ confirm: "  " })).status).toBe(400);
    expect((await erase({ confirm: "a@example.com", userId: "user-b" })).status).toBe(400);
    expect(eraseAccount).not.toHaveBeenCalled();
  });

  it("passes the service's 400 confirm_mismatch through", async () => {
    eraseAccount.mockRejectedValueOnce(new HttpError(400, "confirm_mismatch", "Not your email."));
    const mismatch = await erase({ confirm: "b@example.com" });
    expect(mismatch.status).toBe(400);
    expect((await mismatch.json()).error.code).toBe("confirm_mismatch");

  });

  it("answers 403 when the CSRF check fails", async () => {
    assertSameOrigin.mockImplementationOnce(() => {
      throw new HttpError(403, "csrf_failed", "Reload the page and try again.");
    });
    expect((await erase({ confirm: "a@example.com" })).status).toBe(403);
    expect(eraseAccount).not.toHaveBeenCalled();
  });
});
