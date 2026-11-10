import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/cron/enrich/route";

const { enrichEntries } = vi.hoisted(() => ({ enrichEntries: vi.fn() }));

vi.mock("@/services/metadata/enrich-entries", () => ({ enrichEntries }));

const call = (authorization?: string) =>
  GET(
    new Request("https://lorestep.test/api/cron/enrich", {
      headers: authorization === undefined ? {} : { authorization },
    }),
  );

describe("GET /api/cron/enrich", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    enrichEntries.mockResolvedValue({ scanned: 2, filled: 1, upgraded: 1, failed: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("answers 401 for a missing or wrong secret and enriches nothing", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(enrichEntries).not.toHaveBeenCalled();
  });

  it("runs the sweep for every user with the right secret", async () => {
    const res = await call("Bearer s3cret-value");
    expect(res.status).toBe(200);
    expect(enrichEntries).toHaveBeenCalledWith();
    expect(await res.json()).toEqual({
      data: { enriched: { scanned: 2, filled: 1, upgraded: 1, failed: 0 } },
    });
  });
});
