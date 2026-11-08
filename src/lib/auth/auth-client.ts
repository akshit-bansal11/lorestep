"use client";

import { createAuthClient } from "better-auth/react";

/** The browser's Better-Auth client. Same origin as the server, so it needs no base URL. */
export const authClient = createAuthClient();
