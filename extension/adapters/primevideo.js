/* Prime Video, on primevideo.com and the amazon.* /gp/video/ storefronts.
   Title pages are /detail/{ID} or /detail/{slug}/{ID}; IDs are a 10-character ASIN or a longer
   uppercase GTI. The same title can appear under both forms and per season: the store's title
   match links those tiles together. */
(() => {
  "use strict";
  const ID = /\/detail\/(?:[^/]+\/)?([A-Z0-9]{10,40})(?:\/|$)/;

  const match = (url) => {
    const m = ID.exec(url.pathname);
    return m && { id: m[1], end: m.index + m[0].length };
  };

  globalThis.Lorestep.adapter({
    platform: "primevideo",
    names: ["Amazon.com", "Amazon.in", "Amazon.co.uk", "Amazon.de", "Amazon.co.jp", "Amazon"],
    links: 'a[href*="/detail/"]',
    // Verified live 2026-11-05: tiles are <article data-testid="card" data-card-title="…"
    // data-card-entity-type="Movie|…">, and the /detail/ link inside is an empty overlay with no
    // aria-label, so the title and kind come from the card.
    title: (a) => a.closest("article[data-card-title]")?.dataset.cardTitle || "",
    kind: (a) => {
      const t = a.closest("article[data-card-entity-type]")?.dataset.cardEntityType || "";
      return /movie/i.test(t) ? "movie" : /show|season|series|episode/i.test(t) ? "series" : "";
    },
    // Verified live 2026-11-05: expanded hover cards (inside the tile's <article>), the home
    // billboard and title pages all have a round "Add to / Remove from Watchlist" button in their
    // action row. Our button goes right after it.
    actions: {
      // The aria-label is localised ("ウォッチリストに追加" on amazon.co.jp); the data-testid on its
      // <label> is not: "watchlist-button-add" on title pages, "watchlist-add" on hover cards.
      // Seen 2026-11-08.
      anchor: 'button[aria-label$="Watchlist" i], [data-testid^="watchlist"] > button',
      // The Watchlist button sits in its own small <section> (with the hide ✕) that owns the
      // "Watchlist" tooltip: hovering anything inside it shows that tooltip. Go after the whole
      // section, into the action row itself, so hovering our button shows nothing of Prime's.
      place: (b) => {
        // Title page: <label data-testid=…><button>. Never mount inside the label, or a click on
        // our button would be forwarded to the site's Watchlist button.
        const box = b.parentElement?.localName === "label" ? b.parentElement : b;
        const group = box.parentElement;
        const own = group?.localName === "section" && group.querySelectorAll("button").length <= 3;
        return { after: own ? group : box, like: b };
      },
      resolve(b, h) {
        const card = b.closest("article[data-card-title]");
        const link = card?.querySelector('a[href*="/detail/"]');
        return (link && h.describe(link)) || h.linkNear(b) || h.detail();
      },
    },
    match: (url) => {
      const m = match(url);
      return m && { id: m.id };
    },
    detail: (url) => {
      const m = match(url);
      return m && { id: m.id };
    },
    // Keep the path up to the ID; everything after it is a tracking "ref=" segment.
    canonical: (id, url) => {
      const m = match(url);
      return m ? url.origin + url.pathname.slice(0, m.end).replace(/\/$/, "") : `${url.origin}/detail/${id}`;
    },
  });
})();
