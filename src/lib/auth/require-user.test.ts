import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireUser } from "@/lib/auth/require-user";
import { HttpError } from "@/lib/http/http-error";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/auth/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

const request = (headers: Record<string, string> = {}) =>
  new Request("https://lorestep.test/api/v1/entries", { headers });

describe("requireUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the session user and marks cookie callers as session", async () => {
    getSession.mockResolvedValueOnce({
      user: { id: "u1" },
      session: { id: "s1", client: "browser" },
    });
    const req = request({ cookie: "__Secure-better-auth.session_token=signed" });

    await expect(requireUser(req)).resolves.toEqual({
      userId: "u1",
      via: "session",
      client: "browser",
      sessionId: "s1",
    });
    expect(getSession).toHaveBeenCalledWith({ headers: req.headers });
  });

  it("marks Authorization callers as bearer, whatever the scheme's case", async () => {
    getSession.mockResolvedValue({ user: { id: "u2" }, session: { id: "s2" } });

    for (const authorization of ["Bearer abc.def", "bearer abc.def"]) {
      await expect(requireUser(request({ authorization }))).resolves.toEqual({
        userId: "u2",
        via: "bearer",
        client: "browser",
        sessionId: "s2",
      });
    }
  });

  it("treats a Dogear row as bearer even when its token comes as a cookie", async () => {
    getSession.mockResolvedValueOnce({
      user: { id: "u3" },
      session: { id: "s3", client: "dogear" },
    });
    const req = request({ cookie: "__Secure-better-auth.session_token=dogear-token" });

    await expect(requireUser(req)).resolves.toEqual({
      userId: "u3",
      via: "bearer",
      client: "dogear",
      sessionId: "s3",
    });
  });

  it("throws a 401 HttpError when there is no session", async () => {
    getSession.mockResolvedValueOnce(null);

    const error = await requireUser(request()).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 401, code: "unauthorized" });
  });

  it("fails closed: an unreachable auth store rejects, never signs in", async () => {
    getSession.mockRejectedValueOnce(new Error("connection refused"));

    await expect(requireUser(request())).rejects.toThrow("connection refused");
  });
});
