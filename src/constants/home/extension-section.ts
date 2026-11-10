/** Section B of docs/design/PLAN.md: only what the extension does today. */
export const EXTENSION_FEATURES = [
  {
    title: "Marks on poster tiles",
    body: "Each title you mark shows its state on the poster.",
  },
  {
    title: "A panel on the title page",
    body: "Or a button in the site's own controls, so you mark where you watch.",
  },
  {
    title: "The right-click menu",
    body: "A Lorestep entry sets a mark, and Remove mark clears it.",
  },
  {
    title: "Sync with an account",
    body: "Without one, marks stay in this browser. With one, they sync to your library.",
  },
] as const;
