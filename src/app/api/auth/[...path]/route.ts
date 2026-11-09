import { neonAuth } from "@/lib/auth/neon-auth";
import { withAuthLimit } from "@/lib/http/with-auth-limit";

// The Neon Auth proxy (PLAN.md section 12, N-5). The instance is built inside each handler, never
// at import, so `next build` needs no auth environment. Every method goes through the per-method
// path allowlist; PUT, PATCH and DELETE have none, so they always answer 404.
const handlers = () => neonAuth().handler();

export const GET = withAuthLimit((request, context) => handlers().GET(request, context));
export const POST = withAuthLimit((request, context) => handlers().POST(request, context));
export const PUT = withAuthLimit((request, context) => handlers().PUT(request, context));
export const PATCH = withAuthLimit((request, context) => handlers().PATCH(request, context));
export const DELETE = withAuthLimit((request, context) => handlers().DELETE(request, context));
