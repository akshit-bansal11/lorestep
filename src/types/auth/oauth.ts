/** Next's `searchParams` shape. */
export type SearchRecord = Record<string, string | string[] | undefined>;

/** What the consent page shows about one signed authorization request. */
export interface OAuthRequest {
  clientId: string;
  scopes: string[];
  resource: string | null;
  /** Where the authorization code goes; the consent page shows it (Neon's guidance). */
  redirectHost: string | null;
}
