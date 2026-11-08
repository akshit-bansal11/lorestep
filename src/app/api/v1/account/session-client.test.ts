import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as exportGet } from "@/app/api/v1/account/export/route";
import { DELETE } from "@/app/api/v1/account/route";
import { GET as syncGet } from "@/app/api/v1/sync/route";

const { getSession, rateLimit, assertSameOrigin, eraseAccount, exportAccount, pullChanges } =
  vi.hoisted(() => ({
    getSession: vi.fn(),
    rateLimit: vi.fn(),
    assertSameOrigin: vi.fn(),
    eraseAccount: vi.fn(),
    exportAccount: vi.fn(),
    pullChanges: vi.fn(),
  }));

vi.mock("@/lib/auth/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("@/lib/db/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/http/assert-same-origin", () => ({ assertSameOrigin }));
vi.mock("@/services/account/erase", () => ({ eraseAccount }));
vi.mock("@/services/account/export", () => ({ exportAccount }));
vi.mock("@/services/sync/pull", () => ({ pullChanges }));

const cookie = "__Secure-better-auth.session_token=token-value";

const withClient = (client: string) =>
  getSession.mockResolvedValue({ user: { id: "user-a" }, session: { client } });

const erase = () =>
  DELETE(
    new NextRequest("https://lorestep.test/api/v1/account", {
      method: "DELETE",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ confirm: "a@example.com" }),
    }),
  );

const exportData = () =>
  exportGet(new Request("https://lorestep.test/api/v1/account/export", { headers: { cookie } }));

describe("authorization by session row (sessions.client)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 30 });
    eraseAccount.mockResolvedValue(undefined);
    exportAccount.mockResolvedValue({ exportedAt: "2026-11-09T00:00:00.000Z" });
    pullChanges.mockResolvedValue({ changes: [], next: null });
  });

  it("refuses a Dogear token presented as a cookie with 403 on export and erase", async () => {
    withClient("dogear");

    const exported = await exportData();
    const erased = await erase();

    expect(exported.status).toBe(403);
    expect((await exported.json()).error.code).toBe("session_required");
    expect(erased.status).toBe(403);
    expect(exportAccount).not.toHaveBeenCalled();
    expect(eraseAccount).not.toHaveBeenCalled();
  });

  it("allows a browser session cookie to export and erase", async () => {
    withClient("browser");

    expect((await exportData()).status).toBe(200);
    expect((await erase()).status).toBe(204);
    expect(exportAccount).toHaveBeenCalledWith("user-a");
    expect(eraseAccount).toHaveBeenCalledWith("user-a", "a@example.com");
  });

  it("allows a Dogear bearer token to sync", async () => {
    withClient("dogear");

    const response = await syncGet(
      new Request("https://lorestep.test/api/v1/sync", {
        headers: { authorization: "Bearer token.signature" },
      }),
    );

    expect(response.status).toBe(200);
    expect(pullChanges).toHaveBeenCalledWith("user-a", expect.anything());
  });
});
