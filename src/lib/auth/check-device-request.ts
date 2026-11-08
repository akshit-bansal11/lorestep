import { APIError } from "better-auth/api";

import { DOGEAR_CLIENT_ID } from "@/constants/auth/auth";
import { getAuth } from "@/lib/auth/auth";
import type { DeviceRequestState } from "@/types/auth/auth-form";

/**
 * Looks up a device user code for the signed-in caller through Better-Auth's `GET /device`, which
 * also claims a pending, unclaimed code for that user (approve and deny require the claim).
 * `invalid` covers unknown, expired, another user's, and any client other than Dogear: Better-Auth
 * returns `client_id` only to the user who owns the request.
 */
export async function checkDeviceRequest(
  userCode: string,
  requestHeaders: Headers,
): Promise<DeviceRequestState> {
  try {
    const result = await getAuth().api.deviceVerify({
      query: { user_code: userCode },
      headers: requestHeaders,
    });
    const clientId: unknown = Reflect.get(result, "client_id");
    if (clientId !== DOGEAR_CLIENT_ID) return "invalid";
    return Reflect.get(result, "status") === "pending" ? "pending" : "handled";
  } catch (error) {
    if (error instanceof APIError) return "invalid";
    throw error;
  }
}
