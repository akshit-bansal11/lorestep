import type { JWTVerifyGetKey } from "jose";

import type { AUTH_PROVIDER_IDS } from "@/constants/auth/auth";

export type AuthProviderId = (typeof AUTH_PROVIDER_IDS)[number];

/**
 * How the caller authenticated: a Neon Auth session cookie, or (sync routes only) an extension bearer
 * JWT. The two never mix: `requireUser` reads only the cookie, `requireBearerUser` only the token.
 */
export interface AuthedUser {
  userId: string;
  via: "session" | "bearer";
}

/** The signed-in browser user as Neon Auth's session reports it, for export and erase. */
export interface SessionAccount {
  userId: string;
  email: string;
  name: string;
}

/** What `verifyExtensionToken` checks an extension access token against; `getKey` is the JWKS resolver. */
export interface ExtensionTokenDeps {
  getKey: JWTVerifyGetKey;
  issuer: string;
  audience: string;
  clientId: string;
}

/** The second argument of the `/api/auth/[...path]` handlers. */
export interface AuthRouteContext {
  params: Promise<{ path: string[] }>;
}

export type AuthRouteHandler = (request: Request, context: AuthRouteContext) => Promise<Response>;
