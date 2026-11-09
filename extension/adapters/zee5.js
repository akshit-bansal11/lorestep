/* ZEE5. Title pages are /{movies|web-series|tv-shows}/details/{slug}/{0-N-id}; episode pages
   extend the show path, so the first match is always the show. */
(() => {
  "use strict";
  const ID = /\/(movies|web-series|tv-shows)\/details\/[^/]+\/(0-\d{1,3}-[A-Za-z0-9_]{2,40})(?:\/|$)/;

  const match = (url) => {
    const m = ID.exec(url.pathname);
    return m && { id: m[2], kind: m[1] === "movies" ? "movie" : "series" };
  };

  globalThis.Dogear.adapter({
    platform: "zee5",
    names: ["Zee 5", "Zee5 OTT"],
    links: 'a[href*="/details/"]',
    // document.title is SEO copy ("Murshid Web Series - Watch First Episode Free in 4K, …");
    // the page's <h1> is the bare name. Seen 2026-11-08.
    pageTitle: () => document.querySelector("h1")?.textContent || "",
    match,
    detail: match,
    canonical: (_id, url) => {
      const m = ID.exec(url.pathname);
      return m ? url.origin + url.pathname.slice(0, m.index + m[0].length).replace(/\/$/, "") : url.origin;
    },
  });
})();
