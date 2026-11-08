import { z } from "zod";

import { CSRF_HEADER } from "@/constants/http/http";
import { forgetCsrfToken, getCsrfToken } from "@/lib/api/csrf-token";
import type { ApiFailure, ApiResult } from "@/types/api/api";
import { parseRetryAfter } from "@/utils/auth/auth-failure";

const errorSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) });

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  json?: unknown;
}

type Raw = { ok: true; response: Response } | { ok: false; failure: ApiFailure };

async function failureOf(response: Response): Promise<ApiFailure> {
  let code = "";
  let message = "";
  try {
    const parsed = errorSchema.safeParse(await response.json());
    if (parsed.success) ({ code, message } = parsed.data.error);
  } catch {
    // A non-JSON error body (a proxy page) carries nothing to show; the status is enough.
  }
  return {
    status: response.status,
    code,
    message,
    retryAfterSec: parseRetryAfter(response.headers.get("retry-after")),
  };
}

async function send(path: string, options: RequestOptions, retried: boolean): Promise<Raw> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { accept: "application/json" };
  if (method !== "GET") {
    headers["content-type"] = "application/json";
    const token = await getCsrfToken();
    if (token !== null) headers[CSRF_HEADER] = token;
  }
  try {
    const response = await fetch(path, {
      method,
      headers,
      credentials: "same-origin",
      ...(options.json === undefined ? {} : { body: JSON.stringify(options.json) }),
    });
    if (response.ok) return { ok: true, response };
    const failure = await failureOf(response);
    if (failure.code === "csrf_failed" && !retried) {
      forgetCsrfToken();
      return send(path, options, true);
    }
    return { ok: false, failure };
  } catch (error) {
    console.warn("Request did not complete", error);
    return { ok: false, failure: { status: 0, code: "", message: "", retryAfterSec: null } };
  }
}

/** A write that answers 204 with no body. */
export async function apiSend(path: string, options: RequestOptions): Promise<ApiResult<null>> {
  const raw = await send(path, options, false);
  return raw.ok ? { ok: true, data: null } : raw;
}

/** One call whose whole JSON body must match `schema` (callers wrap `{ data }` themselves). */
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const raw = await send(path, options, false);
  if (!raw.ok) return raw;
  const parsed = schema.safeParse(await raw.response.json().catch(() => null));
  if (!parsed.success) {
    return {
      ok: false,
      failure: { status: 502, code: "bad_response", message: "", retryAfterSec: null },
    };
  }
  return { ok: true, data: parsed.data };
}
