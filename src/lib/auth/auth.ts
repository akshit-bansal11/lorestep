import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { bearer, deviceAuthorization } from "better-auth/plugins";
import { after } from "next/server";

import {
  AUTH_RATE_RULES,
  DOGEAR_CLIENT_ID,
  RESET_TOKEN_TTL_SEC,
  SESSION_CLIENTS,
  SESSION_TTL_SEC,
} from "@/constants/auth/auth";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/constants/auth/password";
import { CLIENT_IP_HEADER } from "@/constants/http/http";
import { githubCredentials, googleCredentials, mailCredentials } from "@/lib/auth/auth-env";
import { afterAuthHook, beforeAuthHook } from "@/lib/auth/auth-hooks";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { sendResetEmail } from "@/lib/auth/send-reset-email";
import { authDb } from "@/lib/db/auth-db";
import {
  accounts,
  authRateLimits,
  deviceCodes,
  sessions,
  users,
  verifications,
} from "@/lib/db/schema";

/**
 * Builds the Better-Auth server. Reads BETTER_AUTH_SECRET and BETTER_AUTH_URL from the
 * environment itself. Model names are the Drizzle schema keys, which is how the adapter finds each
 * table; the SQL names come from `db/migrations/0001_auth_tables.sql`.
 */
function createAuth() {
  const github = githubCredentials();
  const google = googleCredentials();
  const mail = mailCredentials();

  return betterAuth({
    database: drizzleAdapter(authDb(), {
      provider: "pg",
      // Reset spends the token, revokes sessions and saves the password atomically.
      transaction: true,
      schema: { users, sessions, accounts, verifications, deviceCodes, authRateLimits },
    }),
    user: { modelName: "users" },
    session: {
      modelName: "sessions",
      // 30 days absolute: never refreshed, so the first expiry is the last (SEC-08).
      expiresIn: SESSION_TTL_SEC,
      disableSessionRefresh: true,
      additionalFields: {
        // Server-owned: only the device-token after-hook sets "dogear" (auth-hooks.ts).
        client: {
          type: [...SESSION_CLIENTS],
          required: false,
          defaultValue: "browser",
          input: false,
        },
      },
    },
    account: { modelName: "accounts", encryptOAuthTokens: true },
    verification: { modelName: "verifications", storeIdentifier: "hashed" },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      password: { hash: hashPassword, verify: verifyPassword },
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: RESET_TOKEN_TTL_SEC,
      // Without mail the hook answers 503 `reset_unavailable` before this is reached.
      sendResetPassword: async ({ user, url }) => {
        // After the response, so a registered address takes no longer to answer (SEC-10).
        if (mail !== null) after(sendResetEmail(mail, user.email, url));
      },
    },
    socialProviders: {
      ...(github === null ? {} : { github }),
      ...(google === null ? {} : { google }),
    },
    rateLimit: {
      storage: "database",
      modelName: "authRateLimits",
      customRules: AUTH_RATE_RULES,
    },
    advanced: {
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    hooks: { before: beforeAuthHook, after: afterAuthHook },
    plugins: [
      // Only HMAC-signed tokens become sessions, so a token read from the database alone cannot
      // authenticate (PLAN.md section 11 Q2; OPEN_ITEMS.md R1).
      bearer({ requireSignature: true }),
      deviceAuthorization({
        verificationUri: "/device",
        validateClient: (clientId) => clientId === DOGEAR_CLIENT_ID,
        schema: { deviceCode: { modelName: "deviceCodes" } },
      }),
      // Must stay last (Better-Auth Next.js docs).
      nextCookies(),
    ],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/**
 * The auth server, built on first use and never at import, so `next build` and the prerendered
 * pages need no auth environment. A missing DATABASE_URL throws here, at the call site.
 */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
