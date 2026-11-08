import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/cron/purge/route";

const { purgeExpired } = vi.hoisted(() => ({ purgeExpired: vi.fn() }));

vi.mock("@/services/account/purge", () => ({ purgeExpired }));

const call = (authorization?: string) =>
  GET(
    new Request("https://lorestep.test/api/cron/purge", {
      headers: authorization === undefined ? {} : { authorization },
    }),
  );

describe("GET /api/cron/purge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    purgeExpired.mockResolvedValue({ entries: 2 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("answers 401 without an Authorization header and purges nothing", async () => {
    expect((await call()).status).toBe(401);
    expect(purgeExpired).not.toHaveBeenCalled();
  });

  it("answers 401 for a wrong, longer or unprefixed secret", async () => {
    expect((await call("Bearer wrong")).status).toBe(401);
    expect((await call("Bearer s3cret-value-and-more")).status).toBe(401);
    expect((await call("s3cret-value")).status).toBe(401);
    expect(purgeExpired).not.toHaveBeenCalled();
  });

  it("fails closed when CRON_SECRET is unset, even for an empty bearer", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect((await call("Bearer ")).status).toBe(401);
    expect(purgeExpired).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("purges and returns the counts for the right secret", async () => {
    const response = await call("Bearer s3cret-value");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { purged: { entries: 2 } } });
    expect(purgeExpired).toHaveBeenCalledWith(expect.any(Date));
  });
});
