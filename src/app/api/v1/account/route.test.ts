import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE } from "@/app/api/v1/account/route";
import { HttpError } from "@/lib/http/http-error";

const { requireUser, rateLimit, assertSameOrigin, eraseAccount } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  assertSameOrigin: vi.fn(),
  eraseAccount: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/http/assert-same-origin", () => ({ assertSameOrigin }));
vi.mock("@/services/account/erase", () => ({ eraseAccount }));

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
    requireUser.mockResolvedValue({ userId: "user-a", via: "session" });
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
    eraseAccount.mockResolvedValue(undefined);
  });

  it("erases the caller's account with the typed email and answers 204", async () => {
    const response = await erase({ confirm: " a@example.com " });

    expect(response.status).toBe(204);
    expect(assertSameOrigin).toHaveBeenCalledTimes(1);
    expect(eraseAccount).toHaveBeenCalledWith("user-a", "a@example.com");
  });

  it("refuses a bearer token with 403 and erases nothing", async () => {
    requireUser.mockResolvedValue({ userId: "user-a", via: "bearer" });

    const response = await erase({ confirm: "a@example.com" });

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("session_required");
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

    const response = await erase({ confirm: "b@example.com" });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("confirm_mismatch");
  });

  it("answers 401 signed out and 403 when the CSRF check fails", async () => {
    requireUser.mockRejectedValueOnce(new HttpError(401, "unauthorized", "Sign in to continue."));
    expect((await erase({ confirm: "a@example.com" })).status).toBe(401);

    assertSameOrigin.mockImplementationOnce(() => {
      throw new HttpError(403, "csrf_failed", "Reload the page and try again.");
    });
    expect((await erase({ confirm: "a@example.com" })).status).toBe(403);
    expect(eraseAccount).not.toHaveBeenCalled();
  });
});
