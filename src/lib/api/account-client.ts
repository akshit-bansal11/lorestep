import { apiSend } from "@/lib/api/api-request";
import type { ApiResult } from "@/types/api/api";

/** Erase the account; `confirm` is the email the user typed. */
export function eraseAccount(confirm: string): Promise<ApiResult<null>> {
  return apiSend("/api/v1/account", { method: "DELETE", json: { confirm } });
}

/** Sign one device out by session id. */
export function revokeDeviceSession(id: string): Promise<ApiResult<null>> {
  return apiSend(`/api/v1/account/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
}
