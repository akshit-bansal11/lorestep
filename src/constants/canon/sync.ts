/** What a signed-in user answered to "Import N marks from this browser?" ("Not now" is not kept). */
export const IMPORT_DECISIONS = ["imported", "never"] as const;

/** Quiet time after the last edit of a game before its marks are sent to the account. */
export const SYNC_DEBOUNCE_MS = 800;

export const CSRF_URL = "/api/v1/csrf";
export const IMPORT_URL = "/api/v1/import/local";
export const GAME_ENTRY_URL = "/api/v1/entries/game/";
/** The account's games, a page at a time (the route's maximum). */
export const GAME_ENTRIES_URL = "/api/v1/entries?kind=game&limit=100";
