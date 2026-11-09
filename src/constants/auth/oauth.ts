/**
 * The OAuth provider pages (`/oauth/login`, `/oauth/consent`) that Neon Auth sends Dogear's
 * authorization request to (PLAN.md section 12, N4). Wording lives here, like `AUTH_COPY`.
 */

/** Longest signed `oauth_query` accepted. Neon's is a few hundred characters; this bounds abuse. */
export const OAUTH_QUERY_MAX = 4096;

/** What each fixed Neon Auth scope lets the app do, in plain words. Unknown scopes show raw. */
export const SCOPE_LABELS: Readonly<Record<string, string>> = {
  openid: "Confirm which Lorestep account you use",
  email: "See your email address",
  profile: "See your name and picture",
  offline_access: "Stay connected until you sign out of it",
};

export const OAUTH_COPY = {
  login: {
    title: "Sign in to connect an app",
    lead: "An app wants to connect to your Lorestep account. Sign in, then approve it.",
    signedInAs: "Signed in as",
    submit: "Continue",
    pending: "Continuing…",
    done: "Taking you to the approval screen…",
  },
  consent: {
    title: "Connect {name}?",
    lead: "{name} is asking for access to your Lorestep account.",
    wants: "It will be able to:",
    signedInAs: "Signed in as",
    returnsTo: "You will be sent back to",
    allow: "Allow",
    allowing: "Allowing…",
    deny: "Deny",
    denying: "Denying…",
    done: "Done. Returning to {name}…",
  },
  /** The sync resource Dogear asks for (`APP_ORIGIN/api/v1/sync`). */
  syncResource: "Read and change your marks (sync)",
  invalid: {
    title: "This link has expired",
    lead: "Approval links are single-use and time out. Start signing in again from the app.",
    back: "Back to Lorestep",
  },
} as const;
