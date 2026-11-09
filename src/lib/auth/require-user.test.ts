import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireSessionAccount } from "@/lib/auth/require-session-account";
import { requireUser } from "@/lib/auth/require-user";
import { HttpError } from "@/lib/http/http-error";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/auth/neon-auth", () => ({ neonAuth: () => ({ getSession }) }));

const request = (headers: Record<string, string> = {}) =>
  new Request("https://lorestep.test/api/v1/entries", { headers });

const USER = { id: "0b7c2c0e-6c2f-4b8a-9d0e-1f2a3b4c5d6e", email: "a@example.com", name: "A" };

async function statusOf(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught);
  return error instanceof HttpError ? `${error.status} ${error.code}` : "resolved";
}

describe("requireUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the cookie session's user as a session caller", async () => {
    getSession.mockResolvedValueOnce({ data: { user: USER, session: { id: "s1" } }, error: null });

    await expect(requireUser(request())).resolves.toEqual({ userId: USER.id, via: "session" });
  });

  it("answers 401 when Neon Auth reports no session", async () => {
    getSession.mockResolvedValueOnce({ data: null, error: null });
    expect(await statusOf(requireUser(request()))).toBe("401 unauthorized");

    getSession.mockResolvedValueOnce({ data: { user: null, session: null }, error: null });
    expect(await statusOf(requireUser(request()))).toBe("401 unauthorized");
  });

  it("fails closed with 503 when Neon Auth answers an error or throws", async () => {
    getSession.mockResolvedValueOnce({
      data: null,
      error: { message: "down", status: 502, statusText: "Bad Gateway", code: "INTERNAL_ERROR" },
    });
    expect(await statusOf(requireUser(request()))).toBe("503 auth_unavailable");

    getSession.mockRejectedValueOnce(new Error("connection refused"));
    expect(await statusOf(requireUser(request()))).toBe("503 auth_unavailable");
  });

  it("refuses a bearer token with 401 without asking Neon Auth", async () => {
    for (const authorization of ["Bearer a.b.c", "bearer a.b.c"]) {
      expect(await statusOf(requireUser(request({ authorization })))).toBe("401 unauthorized");
    }
    expect(getSession).not.toHaveBeenCalled();
  });
});

describe("requireSessionAccount", () => {
  it("returns the id, email and name from the session user", async () => {
    getSession.mockResolvedValueOnce({
      data: { user: { ...USER, image: null }, session: { id: "s1", token: "secret" } },
      error: null,
    });

    await expect(requireSessionAccount(request())).resolves.toEqual({
      userId: USER.id,
      email: USER.email,
      name: USER.name,
    });
  });
});
