import { isIP } from "node:net";

import { CLIENT_IP_HEADER } from "@/constants/http/http";

/**
 * The client IP from the proxy-set header only (SEC-20). Vercel overwrites it with one address, so
 * a list, a blank or anything that is not an IP literal means it did not come from the proxy and
 * yields null. Callers on unauthenticated routes deny on null.
 */
export function clientIp(headers: Headers): string | null {
  const value = headers.get(CLIENT_IP_HEADER)?.trim() ?? "";
  return isIP(value) === 0 ? null : value;
}
