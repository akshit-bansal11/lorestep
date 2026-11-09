import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiRequest, apiSend } from "@/lib/api/api-request";
import { forgetCsrfToken } from "@/lib/api/csrf-token";

const fetchMock = vi.fn();
const json = (body: unknown, init?: ResponseInit) => Response.json(body, init);
const schema = z.object({ data: z.object({ n: z.number() }) });

/** The headers of the nth fetch call, as the client built them. */
function headersOf(call: number): Record<string, string> {
  const init: unknown = fetchMock.mock.calls[call]?.[1];
  return z.object({ headers: z.record(z.string(), z.string()) }).parse(init).headers;
}

beforeEach(() => {
  forgetCsrfToken();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("apiRequest", () => {
  it("sends no CSRF request or header on a read", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { n: 1 } }));
    const result = await apiRequest("/api/v1/x", schema);
    expect(result).toEqual({ ok: true, data: { data: { n: 1 } } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(headersOf(0)["x-csrf-token"]).toBeUndefined();
  });

  it("echoes the CSRF token and a JSON body on a write", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { token: "tok" } }));
    fetchMock.mockResolvedValueOnce(json({ data: { n: 2 } }));
    await apiRequest("/api/v1/x", schema, { method: "POST", json: { a: 1 } });
    expect(headersOf(1)["x-csrf-token"]).toBe("tok");
    expect(headersOf(1)["content-type"]).toBe("application/json");
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ a: 1 }));
  });

  it("fetches a fresh token and retries once after csrf_failed", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { token: "old" } }));
    fetchMock.mockResolvedValueOnce(
      json({ error: { code: "csrf_failed", message: "Reload." } }, { status: 403 }),
    );
    fetchMock.mockResolvedValueOnce(json({ data: { token: "new" } }));
    fetchMock.mockResolvedValueOnce(json({ data: { n: 3 } }));
    const result = await apiRequest("/api/v1/x", schema, { method: "PATCH", json: {} });
    expect(result.ok).toBe(true);
    expect(headersOf(3)["x-csrf-token"]).toBe("new");
  });

  it("reports the server's code, message and Retry-After", async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        { error: { code: "rate_limited", message: "Slow down." } },
        { status: 429, headers: { "retry-after": "12" } },
      ),
    );
    expect(await apiRequest("/api/v1/x", schema)).toEqual({
      ok: false,
      failure: { status: 429, code: "rate_limited", message: "Slow down.", retryAfterSec: 12 },
    });
  });

  it("reports status 0 when the network is down", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const result = await apiRequest("/api/v1/x", schema);
    expect(result.ok === false && result.failure.status).toBe(0);
  });

  it("treats a body that fails the schema as a bad response", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { n: "one" } }));
    const result = await apiRequest("/api/v1/x", schema);
    expect(result.ok === false && result.failure.code).toBe("bad_response");
  });
});

describe("apiSend", () => {
  it("succeeds on 204", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { token: "tok" } }));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await apiSend("/api/v1/x", { method: "DELETE" })).toEqual({ ok: true, data: null });
  });
});
