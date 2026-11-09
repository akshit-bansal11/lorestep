/* JioHotstar. Title pages are /{region}/shows/{slug}/{id} and /{region}/movies/{slug}/{id};
   episode pages extend the show path, so the first match is always the show. */
(() => {
  "use strict";
  const ID = /\/(shows|movies)\/[^/]+\/(\d{4,20})(?:\/|$)/;

  const match = (url) => {
    const m = ID.exec(url.pathname);
    return m && { id: m[2], kind: m[1] === "movies" ? "movie" : "series" };
  };

  globalThis.Lorestep.adapter({
    platform: "hotstar",
    names: ["Hotstar", "Disney+ Hotstar", "JioCinema"],
    links: 'a[href*="/shows/"], a[href*="/movies/"]',
    // The link's aria-label carries progress ("Fateh, Movie, 2 hours, 3 minutes left"); the
    // poster's alt is the bare title. Seen 2026-11-08.
    title: (a) => [...a.querySelectorAll("img[alt]")].find((i) => i.alt.trim())?.alt || "",
    // Most row tiles aren't links: <div data-testid="action" aria-label="Title,Movie"> with the
    // poster inside and no ID anywhere in the DOM (seen 2026-11-08). Display-only, by title.
    cards: {
      selector: 'div[data-testid="action"]',
      title: (c) => [...c.querySelectorAll("img[alt]")].find((i) => i.alt.trim())?.alt || "",
    },
    match,
    detail: match,
    canonical: (_id, url) => {
      const m = ID.exec(url.pathname);
      return m ? url.origin + url.pathname.slice(0, m.index + m[0].length).replace(/\/$/, "") : url.origin;
    },
  });
})();
