import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth/auth";

// A function, not the instance, so the auth server is built on first request, never at import.
const handler = (request: Request) => getAuth().handler(request);

export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(handler);
