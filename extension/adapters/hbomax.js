/* HBO Max (play.hbomax.com, and play.max.com from the Max years).
   Title pages are /show/{uuid}, /mini-series/{uuid}, /movie/{uuid} or /feature/{uuid}. */
(() => {
  "use strict";
  const ID =
    /\/(show|series|mini-series|movie|feature)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i;
  const MOVIE = new Set(["movie", "feature"]);

  const match = (url) => {
    const m = ID.exec(url.pathname);
    return m && { id: m[2].toLowerCase(), kind: MOVIE.has(m[1].toLowerCase()) ? "movie" : "series" };
  };

  globalThis.Lorestep.adapter({
    platform: "hbomax",
    names: ["Max", "HBO"],
    links: 'a[href*="/show/"], a[href*="/series/"], a[href*="/mini-series/"], a[href*="/movie/"], a[href*="/feature/"]',
    match,
    detail: match,
    canonical: (id, url) => {
      const m = ID.exec(url.pathname);
      return m ? `${url.origin}/${m[1].toLowerCase()}/${id}` : url.origin;
    },
  });
})();
