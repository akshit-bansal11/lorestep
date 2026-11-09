import { beforeEach, describe, expect, it, vi } from "vitest";

import { newPasswordIn, rejectDogearSession, rejectPwnedPassword } from "@/lib/auth/auth-hooks";

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

describe("rejectDogearSession", () => {
  // A correctly shaped signature: 43 base64 characters and one `=` (URL-encoded in cookies).
  const SIG = `${"A".repeat(43)}=`;
  const cookieSig = encodeURIComponent(SIG);
  const lookup = (client: string) =>
    vi
      .fn<(token: string) => Promise<{ session: object }>>()
      .mockResolvedValue({ session: { client } });
  const dogear = lookup("dogear");
  const browser = lookup("browser");
  const bearer = new Headers({ authorization: `Bearer rawtoken.${SIG}` });
  const cookie = new Headers({
    cookie: `__Secure-better-auth.session_token=rawtoken.${cookieSig}`,
  });

  it("refuses a Dogear session on account-changing paths, by bearer or by cookie", async () => {
    for (const path of ["/revoke-sessions", "/list-sessions", "/update-user", "/device/approve"]) {
      for (const headers of [bearer, cookie]) {
        await expect(rejectDogearSession(path, headers, dogear)).rejects.toMatchObject({
          body: { code: "dogear_forbidden" },
        });
      }
    }
    expect(dogear).toHaveBeenCalledWith("rawtoken");
  });

  it("lets a Dogear session read itself, sign out and pair", async () => {
    for (const path of ["/get-session", "/sign-out", "/device/code", "/device/token"]) {
      await expect(rejectDogearSession(path, bearer, dogear)).resolves.toBeUndefined();
    }
  });

  it("checks every credential, so a harmless one cannot hide a Dogear cookie", async () => {
    const byToken = vi
      .fn<(token: string) => Promise<{ session: object } | null>>()
      .mockImplementation(async (token) => ({
        session: { client: token === "dogeartoken" ? "dogear" : "browser" },
      }));
    const mixed = [
      new Headers({
        authorization: `Bearer browsertoken.${SIG}`,
        cookie: `__Secure-better-auth.session_token=dogeartoken.${cookieSig}`,
      }),
      new Headers({
        cookie: `better-auth.session_token=browsertoken.${cookieSig}; __Secure-better-auth.session_token="dogeartoken.${cookieSig}"`,
      }),
    ];
    for (const headers of mixed) {
      await expect(rejectDogearSession("/revoke-sessions", headers, byToken)).rejects.toMatchObject(
        {
          body: { code: "dogear_forbidden" },
        },
      );
    }
  });

  it("refuses malformed or excess session credentials without a lookup", async () => {
    const find = vi.fn<(token: string) => Promise<{ session: object } | null>>();
    const bad = [
      new Headers({ cookie: "__Secure-better-auth.session_token=nosignature" }),
      new Headers({ cookie: "better-auth.session_token=%E0%A4%A" }),
      new Headers({
        cookie: Array.from({ length: 4 }, (_, i) => `s${i}.session_token=t${i}.${cookieSig}`).join(
          "; ",
        ),
      }),
    ];
    for (const headers of bad) {
      await expect(rejectDogearSession("/update-user", headers, find)).rejects.toMatchObject({
        body: { code: "invalid_credentials" },
      });
    }
    expect(find).not.toHaveBeenCalled();
  });

  it("lets browser sessions and credential-free requests through", async () => {
    await expect(rejectDogearSession("/revoke-sessions", cookie, browser)).resolves.toBeUndefined();
    await expect(
      rejectDogearSession("/sign-in/email", new Headers(), dogear),
    ).resolves.toBeUndefined();
    await expect(rejectDogearSession("/update-user", undefined, dogear)).resolves.toBeUndefined();
  });
});
