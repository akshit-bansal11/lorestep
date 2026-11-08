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
