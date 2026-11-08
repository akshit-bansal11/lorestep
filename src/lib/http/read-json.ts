import { HttpError } from "@/lib/http/http-error";

/**
 * The request body parsed as JSON, or `null` when it is not JSON (the caller's zod parse then
 * answers 400). Throws HttpError 413 past `maxBytes` (API body cap, PLAN.md section 5).
 */
export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  const tooLarge = new HttpError(413, "too_large", "The request body is too large.");
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) throw tooLarge;

  const text = await request.text();
  if (Buffer.byteLength(text) > maxBytes) throw tooLarge;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
