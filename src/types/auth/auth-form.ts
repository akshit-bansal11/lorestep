/** Field name to the message shown under it. An absent key means the field is valid. */
export type FieldErrors = Partial<Record<string, string>>;

/** Which form a failure came from; the same status reads differently on each. */
export type AuthContext = "sign-in" | "sign-up" | "reset-request" | "reset" | "social" | "device";

/** Where the `/device` approval stands. */
export type DevicePhase = "idle" | "approving" | "denying" | "approved" | "denied";

/** What the server-side check of a `/device?user_code=` link found. */
export type DeviceRequestState = "pending" | "handled" | "invalid";

/** What a failed Better-Auth call leaves behind. `status` 0 means the request never got an answer. */
export interface AuthFailure {
  status: number;
  code: string;
  retryAfterSec: number | null;
}

/** The shape `/api/v1/auth-providers` reports. */
export interface AuthProviders {
  github: boolean;
  google: boolean;
  reset: boolean;
}

export type SocialProvider = "github" | "google";

/** The part of the session the UI shows. */
export interface SessionUser {
  name: string;
  email: string;
  image: string | null;
}
