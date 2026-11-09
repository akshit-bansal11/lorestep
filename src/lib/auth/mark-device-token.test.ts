import { describe, expect, it, vi } from "vitest";

import { markDeviceToken } from "@/lib/auth/auth-hooks";
import { signSessionToken } from "@/lib/auth/sign-session-token";
import type { DeviceTokenContext } from "@/types/auth/auth";

const SECRET = "test-secret-at-least-32-characters-long";
const RAW = "rawSessionToken123";

function context(path: string, returned: unknown, updated: object | null) {
  const updateSession = vi
    .fn<DeviceTokenContext["context"]["internalAdapter"]["updateSession"]>()
    .mockResolvedValue(updated);
  const ctx: DeviceTokenContext = {
    path,
    context: { returned, secret: SECRET, internalAdapter: { updateSession } },
  };
  return { ctx, updateSession };
}

describe("markDeviceToken (the /device/token after hook)", () => {
  it("marks the row dogear, then returns the signed token", async () => {
    const { ctx, updateSession } = context(
      "/device/token",
      { access_token: RAW, token_type: "Bearer" },
      { id: "s1", client: "dogear" },
    );

    await markDeviceToken(ctx);

    expect(updateSession).toHaveBeenCalledExactlyOnceWith(RAW, {
      client: "dogear",
      userAgent: "Dogear (Chrome)",
    });
    expect(ctx.context.returned).toEqual({
      access_token: signSessionToken(RAW, SECRET),
      token_type: "Bearer",
    });
  });

  it("returns no token when the row could not be marked", async () => {
    for (const updated of [null, { id: "s1", client: "browser" }]) {
      const { ctx } = context("/device/token", { access_token: RAW }, updated);

      await expect(markDeviceToken(ctx)).rejects.toMatchObject({
        body: { code: "device_token_failed" },
      });
      expect(ctx.context.returned).toEqual({ access_token: RAW });
    }
  });

  it("refuses a token that already contains a dot, without touching the row", async () => {
    const { ctx, updateSession } = context("/device/token", { access_token: "a.b" }, null);

    await expect(markDeviceToken(ctx)).rejects.toMatchObject({
      body: { code: "device_token_failed" },
    });
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("leaves other paths and pairing errors untouched", async () => {
    const other = context("/sign-in/email", { token: RAW }, null);
    await markDeviceToken(other.ctx);
    expect(other.ctx.context.returned).toEqual({ token: RAW });

    const pending = new Error("authorization_pending");
    const error = context("/device/token", pending, null);
    await markDeviceToken(error.ctx);
    expect(error.ctx.context.returned).toBe(pending);

    expect(other.updateSession).not.toHaveBeenCalled();
    expect(error.updateSession).not.toHaveBeenCalled();
  });
});
