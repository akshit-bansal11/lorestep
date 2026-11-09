import { neonAuth } from "@/lib/auth/neon-auth";
import { withAuthLimit } from "@/lib/http/with-auth-limit";
import type { AuthRouteHandler } from "@/types/auth/auth";

// The Neon Auth proxy (PLAN.md section 12, N-5). The instance is built inside each handler, never
// at import, so `next build` needs no auth environment.
const handlers = () => neonAuth().handler();

export const GET: AuthRouteHandler = (request, context) => handlers().GET(request, context);
export const POST = withAuthLimit((request, context) => handlers().POST(request, context));
export const PUT: AuthRouteHandler = (request, context) => handlers().PUT(request, context);
export const PATCH: AuthRouteHandler = (request, context) => handlers().PATCH(request, context);
export const DELETE: AuthRouteHandler = (request, context) => handlers().DELETE(request, context);
