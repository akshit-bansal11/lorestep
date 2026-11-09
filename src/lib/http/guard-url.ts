import { isIP } from "node:net";

import {
  ALLOWED_LINK_HOSTS,
  FETCH_TIMEOUT_MS,
  HTML_MAX_BYTES,
  MAX_REDIRECTS,
} from "@/constants/metadata/metadata";

/** A URL outside the SSRF policy (PLAN.md section 11 R6). The route answers 422. */
export class UnsafeUrlError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "UnsafeUrlError";
  }
}

/**
 * Accept only `https:` on the default port, no userinfo, no IP literal (the URL parser has already
 * folded decimal/hex/octal IPv4 spellings into dotted form, which `isIP` catches), and a host on
 * the explicit allowlist. Returns the parsed URL; throws UnsafeUrlError.
 */
export function assertSafeUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("not a URL");
  }
  if (url.protocol !== "https:") throw new UnsafeUrlError("not https");
  if (url.username !== "" || url.password !== "") throw new UnsafeUrlError("has userinfo");
  if (url.port !== "") throw new UnsafeUrlError("has a port");
  const host = url.hostname.toLowerCase();
  if (host.startsWith("[") || isIP(host) !== 0) throw new UnsafeUrlError("IP literal");
  if (!ALLOWED_LINK_HOSTS.has(host)) throw new UnsafeUrlError("host not supported");
  return url;
}

async function readCapped(res: Response): Promise<string> {
  if (res.body === null) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  while (bytes < HTML_MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    text += decoder.decode(value, { stream: true });
  }
  await reader.cancel();
  return text;
}

/**
 * GET a page as text. Every hop is re-validated, redirects are followed by hand and only within the
 * same host, the body is cut at HTML_MAX_BYTES. Returns null when the page answers non-2xx or the
 * network fails; throws UnsafeUrlError for any policy violation, including a redirect elsewhere.
 */
export async function fetchGuardedText(
  raw: string,
  headers: HeadersInit,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  let url = assertSafeUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let res: Response;
    try {
      res = await fetchImpl(url, {
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      return null;
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (location === null) return null;
      const next = assertSafeUrl(new URL(location, url).href);
      if (next.hostname !== url.hostname) throw new UnsafeUrlError("redirect to another host");
      url = next;
      continue;
    }
    return res.ok ? readCapped(res) : null;
  }
  throw new UnsafeUrlError("too many redirects");
}
