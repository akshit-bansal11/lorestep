"use client";

import { createAuthClient } from "@neon/auth/next";

/**
 * The browser's Neon Auth client. It talks to this origin's `/api/auth/*` proxy, so it needs no
 * base URL; sign-in, sign-up, social, sign-out, password reset and `useSession` keep their names.
 */
export const authClient = createAuthClient();
