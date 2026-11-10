/**
 * Home page copy as data. Every claim is listed in docs/design/PLAN.md section B with its proof.
 * Not claimed: item detail panel, like/dislike, in-universe dates, runtimes, other browsers, a
 * Web Store listing. Nothing here says "sign in": the header holds the only such link.
 */

/** The three ways in. */
export const HOME_WAYS = [
  {
    id: "watch-orders",
    title: "Watch orders",
    body: "Story order for movies, series and games. Browsing needs no account, and your marks stay in this browser.",
    href: "/screen",
  },
  {
    id: "tracker",
    title: "Tracker",
    body: "Keep a library of movies, series, anime, manga and games. Each title is Planned, Watching, Completed, On hold or Dropped, and you can group titles into lists. It needs an account.",
    href: "/library",
  },
  {
    id: "extension",
    title: "Lorestep for Chrome",
    body: "Mark posters on Netflix, Prime Video, JioHotstar, ZEE5, HBO Max and Crunchyroll. It works without an account, and syncs your marks when you have one.",
    href: "/extension",
  },
] as const;

/** The Metal Gear line under the story/release switch. */
export const DEMO_NOTE =
  "In Metal Gear, Metal Gear Solid 3 (2004) is story step 1, set from 1964. The story order is nearly the reverse of release order.";

export const HOME_FACTS = [
  {
    title: "Free and open source",
    body: "Lorestep is MIT licensed and has no payment dependency.",
  },
  {
    title: "No account to browse",
    body: "The watch orders and the games table are open to everyone. Marks you make there are kept in this browser.",
  },
  {
    title: "Your data leaves with you",
    body: "Export everything as JSON, or erase your account by typing your email to confirm.",
  },
  {
    title: "Only marked titles are sent",
    body: "The extension reads titles on pages of the six supported services. It sends Lorestep only the titles you mark.",
  },
] as const;

export const HOME_FAQ = [
  {
    question: "Does Lorestep cost anything?",
    answer:
      "No. It is MIT licensed and has no payment dependency. You can browse the watch orders and the games table without an account. The library, lists and sync need one.",
  },
  {
    question: "Which services does the extension work on?",
    answer:
      "Netflix, Prime Video, JioHotstar, ZEE5, HBO Max and Crunchyroll, in Chrome 114 or newer. It puts marks on poster tiles, adds a button in the site's own controls or a panel on a title page, and adds a Lorestep entry to the right-click menu with a Remove mark option.",
  },
  {
    question: "What does the extension send to Lorestep?",
    answer:
      "Only titles you have marked: the service, its id for the title, the title, your status, the time of the mark, the kind and a link. Without an account, nothing leaves your browser.",
  },
  {
    question: "How does the extension connect to my account?",
    answer:
      "In a browser window with a consent screen. The tokens stay in the extension's background worker. Once connected, marks sync every 30 minutes, when you open the extension library, and when you press Sync now.",
  },
  {
    question: "Can I take my data out or delete it?",
    answer:
      "Yes. Export your data as JSON from your account page. You can also erase your account by typing your email, which removes your library and lists and ends your sessions. The account page lists your sessions so you can sign out of any of them. The extension library has its own search, filters, export, import and Back up now.",
  },
] as const;
