"use client";

import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * The browser's Better-Auth client. Same origin as the server, so it needs no base URL. The device
 * plugin adds `device.approve` / `device.deny` for the `/device` page.
 */
export const authClient = createAuthClient({ plugins: [deviceAuthorizationClient()] });
