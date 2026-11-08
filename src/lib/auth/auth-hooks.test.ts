import { beforeEach, describe, expect, it, vi } from "vitest";

import { newPasswordIn, rejectPwnedPassword } from "@/lib/auth/auth-hooks";

const { isPasswordCompromised } = vi.hoisted(() => ({ isPasswordCompromised: vi.fn() }));

vi.mock("better-auth/plugins/haveibeenpwned", () => ({ isPasswordCompromised }));

describe("newPasswordIn", () => {
  it("reads the new-password field of each password-setting endpoint", () => {
    expect(newPasswordIn("/sign-up/email", { email: "a@b.c", password: "p1" })).toBe("p1");
    expect(newPasswordIn("/change-password", { newPassword: "p2" })).toBe("p2");
    expect(newPasswordIn("/reset-password", { token: "t", newPassword: "p3" })).toBe("p3");
  });

  it("ignores sign-in, whose password is not new, and malformed bodies", () => {
    expect(newPasswordIn("/sign-in/email", { password: "p" })).toBeNull();
    expect(newPasswordIn("/sign-up/email", null)).toBeNull();
    expect(newPasswordIn("/sign-up/email", { password: 42 })).toBeNull();
  });
});

describe("rejectPwnedPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a password the service has not seen", async () => {
    isPasswordCompromised.mockResolvedValueOnce(false);
    await expect(rejectPwnedPassword("a fresh long passphrase")).resolves.toBeUndefined();
  });

  it("rejects a breached password with PASSWORD_COMPROMISED", async () => {
    isPasswordCompromised.mockResolvedValueOnce(true);
    await expect(rejectPwnedPassword("password123456789")).rejects.toMatchObject({
      body: { code: "PASSWORD_COMPROMISED" },
    });
  });

  it("fails open, logged, when the service is unreachable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    isPasswordCompromised.mockRejectedValueOnce(new Error("timeout"));

    await expect(rejectPwnedPassword("a fresh long passphrase")).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });
});
