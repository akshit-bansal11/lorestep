import {
  FETCH_RETRY_COUNT,
  FETCH_RETRY_DELAY_MS,
  FETCH_TIMEOUT_MS,
} from "@/constants/metadata/metadata";
import type { FetchResult } from "@/types/metadata/metadata";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GET/POST a fixed provider URL and parse JSON. Each attempt has its own timeout; 429, 5xx and
 * network errors retry with backoff. Redirects are not followed. The error text is fixed: provider
 * URLs carry API keys, so neither the URL nor the transport message ever reaches a log or client.
 * The payload is unvalidated: callers narrow every field they read.
 */
export async function safeFetchJson<T = unknown>(
  url: string,
  init?: RequestInit,
  retries = FETCH_RETRY_COUNT,
): Promise<FetchResult<T>> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const last = attempt === retries;
    try {
      const res = await fetch(url, {
        ...init,
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok) return { ok: true, data: await res.json() };
      if (!last && (res.status === 429 || res.status >= 500)) {
        await sleep(FETCH_RETRY_DELAY_MS * 2 ** attempt);
        continue;
      }
      return { ok: false, error: `Provider answered ${res.status}` };
    } catch {
      if (last) return { ok: false, error: "Provider request failed" };
      await sleep(FETCH_RETRY_DELAY_MS * 2 ** attempt);
    }
  }
  return { ok: false, error: "Provider request failed" };
}
