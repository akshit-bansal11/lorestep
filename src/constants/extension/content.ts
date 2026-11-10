/** Section B of docs/design/PLAN.md: every line here has a proof row there. */
export const EXTENSION_VERSION = "0.9.0";

export const EXTENSION_LIBRARY_ITEMS = [
  {
    title: "A library in the toolbar",
    body: "Search your marks, filter by service and state, export, import, or press Back up now.",
  },
  {
    title: "Two switches",
    body: "Dim finished and dropped titles, and link the same title across services.",
  },
] as const;

export const EXTENSION_STATES_LINE =
  "Five states: Planned, Watching (Playing or Reading for games and books), Completed, On hold and Dropped. Movies, series, anime, manga and games each get their own wording.";

export const EXTENSION_SYNC_STEPS = [
  "Start from the extension. A browser window opens on Lorestep.",
  "Log in with your Lorestep account there, or create one.",
  "A consent screen asks you to allow the extension. Allow it, and the window closes.",
  "Marks then push and pull every 30 minutes, when you open the library, and when you choose Sync now.",
] as const;

export const EXTENSION_PRIVACY =
  "The extension reads titles on pages of the six services. It sends Lorestep only the titles you have marked: service, id, title, state, time, kind and link. Your tokens stay in the extension's background worker. You can export your library as JSON, erase everything by typing your email, and list your sessions from your account.";
