import { isIP } from "node:net";

import { CLIENT_IP_HEADER } from "@/constants/http/http";

const MAPPED_IPV4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;

/**
 * The first four groups of a valid IPv6 address, each without leading zeros, as `a:b:c:d::/64`.
 * Drops a zone id and expands `::`, so every spelling of one /64 gives one key. An embedded dotted
 * IPv4 tail counts as two groups; it always sits past the /64, so it is never read.
 */
function ipv6Prefix64(address: string): string {
  const [head = "", tail] = (address.split("%")[0] ?? "").toLowerCase().split("::");
  const groups = (part: string) => (part === "" ? [] : part.split(":"));
  const width = (parts: string[]) => parts.length + (parts.at(-1)?.includes(".") ? 1 : 0);
  const left = groups(head);
  const right = tail === undefined ? [] : groups(tail);
  const zeros = Array.from({ length: 8 - width(left) - width(right) }, () => "0");
  const full = [...left, ...zeros, ...right];
  const prefix = full.slice(0, 4).map((group) => Number.parseInt(group, 16).toString(16));
  return `${prefix.join(":")}::/64`;
}

/**
 * The client's limiter key from the proxy-set header only (SEC-20). Vercel overwrites it with one
 * address, so a list, a blank or anything that is not an IP literal means it did not come from
 * the proxy and yields null. Callers on unauthenticated routes deny on null. IPv4 is the address
 * itself (an IPv4-mapped IPv6 address included); IPv6 is its /64, since one host usually holds a
 * whole /64 and could otherwise rotate through 2^64 buckets.
 */
export function clientIp(headers: Headers): string | null {
  const value = headers.get(CLIENT_IP_HEADER)?.trim() ?? "";
  const kind = isIP(value);
  if (kind === 4) return value;
  if (kind !== 6) return null;
  const mapped = MAPPED_IPV4.exec(value)?.[1];
  return mapped !== undefined && isIP(mapped) === 4 ? mapped : ipv6Prefix64(value);
}
