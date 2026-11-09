import type { JWTVerifyGetKey } from "jose";

import type { SESSION_CLIENTS } from "@/constants/auth/auth";

export interface Argon2Cost {
  /** KiB. */
  memory: number;
  passes: number;
  parallelism: number;
  /** Bytes. */
  tagLength: number;
}

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

export interface MailCredentials {
  apiKey: string;
  from: string;
}

/** Which client holds a session row (`sessions.client`). */
export type SessionClient = (typeof SESSION_CLIENTS)[number];

/**
 * How `requireUser` authenticated the caller. Bearer callers are exempt from CSRF checks. A Dogear
 * session is always `bearer`, whatever transport carried its token.
 */
export interface AuthedUser {
  userId: string;
  via: "session" | "bearer";
  client: SessionClient;
  /** The calling session row's id, so a route can act on exactly that session. */
  sessionId: string;
}

/** The slice of Better-Auth's after-hook context that `markDeviceToken` reads and writes. */
export interface DeviceTokenContext {
  path: string;
  context: {
    returned?: unknown;
    secret: string;
    internalAdapter: {
      updateSession(
        token: string,
        data: { client: SessionClient; userAgent: string },
      ): Promise<object | null>;
    };
  };
}

/** Session credentials a request carries, unverified; `refuse` when any is malformed or excess. */
export interface CredentialScan {
  tokens: string[];
  refuse: boolean;
}

/** What `verifyDogearToken` checks a Dogear access token against; `getKey` is the JWKS resolver. */
export interface DogearTokenDeps {
  getKey: JWTVerifyGetKey;
  issuer: string;
  audience: string;
  clientId: string;
}
