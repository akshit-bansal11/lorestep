/* Crunchyroll. Series pages are /series/{ID}/{slug}, optionally under a locale (/es/series/...).
   Episode pages (/watch/{episodeID}/...) carry no series ID in the URL, but link their series
   in the header: <a data-t="show-title-link" href="/series/{ID}/...">{series name}</a>
   (seen 2026-11-08), so they get the series' panel. */
(() => {
  "use strict";
  const ID = /\/series\/([A-Z0-9]{6,14})(?:\/|$)/;
  const SHOW_LINK = 'a[data-t="show-title-link"][href*="/series/"]';

  const match = (url) => {
    const m = ID.exec(url.pathname);
    return m && { id: m[1], kind: "series" };
  };

  const showLink = () => globalThis.document?.querySelector(SHOW_LINK);

  globalThis.Dogear.adapter({
    platform: "crunchyroll",
    links: 'a[href*="/series/"]',
    match,
    detail(url) {
      if (!/\/watch\//.test(url.pathname)) return match(url);
      const a = showLink();
      try {
        return a ? match(new URL(a.href)) : null;
      } catch {
        return null;
      }
    },
    // On an episode page document.title names the episode; the header link names the series.
    pageTitle: () => showLink()?.textContent || "",
    canonical: (id, url) => `${url.origin}/series/${id}`,
  });
})();
