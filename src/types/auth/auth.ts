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

/** How `requireUser` authenticated the caller. Bearer callers are exempt from CSRF checks. */
export interface AuthedUser {
  userId: string;
  via: "session" | "bearer";
}
