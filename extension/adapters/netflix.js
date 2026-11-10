/* Netflix. Verified live on 2026-11-05: browse tiles (standard, Continue Watching, Top 10) are
   <a href="/browse?jbv={id}" aria-label="{title}" data-uia="standard-card|progress-card|ranked-card">.
   Title pages are /title/{id}, or any page with ?jbv={id} while the details modal is open.
   The /watch/ page is the player, so it gets no panel.
   Verified live 2026-11-10: the details modal's "More like this" cards are not links. Each is
   <div data-uia="titleCard--container" aria-label="{title}"> inside .moreLikeThis--container, with
   the title ID as video_id in its .ptrack-content's URI-encoded JSON data-ui-tracking-context.
   Episode cards share the container but sit elsewhere, so the selector leaves them out.
   The title page's collection row (".titleGroup--container", e.g. "The Witcher Collection") uses
   the same cards with the same tracking data, but without Netflix's My List button. */
(() => {
  "use strict";
  const PATH = /\/(?:watch|title)\/(\d{5,12})(?:\/|$)/;
  const TITLE = /\/title\/(\d{5,12})(?:\/|$)/;
  const NUM = /^\d{5,12}$/;

  const jbv = (url) => {
    const id = url.searchParams.get("jbv");
    return id && NUM.test(id) ? { id } : null;
  };

  /** The title ID from a card's tracking data, or null when it is missing or malformed. */
  const trackedId = (card) => {
    const raw = card.querySelector("[data-ui-tracking-context]")?.getAttribute("data-ui-tracking-context");
    if (!raw) return null;
    try {
      const id = String(JSON.parse(decodeURIComponent(raw)).video_id ?? "");
      return NUM.test(id) ? id : null;
    } catch {
      return null;
    }
  };

  const CARDS =
    '.moreLikeThis--container [data-uia="titleCard--container"], .titleGroup--container [data-uia="titleCard--container"]';

  const notOurs = (el) => [...el.children].filter((c) => c.localName !== "lorestep-action");

  /**
   * Our button on a card. Verified live 2026-11-10: the card's metadata row wraps, so a third
   * item there drops onto its own line. "More like this" cards: it goes inside My List's own
   * slot, which is made a flex row, so it sits right beside the + at the same size. Collection
   * cards have no button: it ends the year and rating line, pushed right, at a fixed size.
   */
  const placeOnCard = (card) => {
    const plus = card.querySelector('.titleCard--metadataWrapper [data-uia="add-to-my-list"]');
    if (plus) {
      const slot = plus.closest(".ptrack-content") || plus;
      const holder = slot.parentElement;
      if (!holder) return null;
      if (holder.style.display !== "flex") {
        holder.style.display = "flex";
        holder.style.alignItems = "center";
        holder.style.gap = "8px";
      }
      return { after: slot, like: plus, fit: { margin: "0" } };
    }
    // The line orders its items with CSS order (the year is order 2) and only spans its badges,
    // so ours takes a later order and the line spans the card, putting it at the right edge.
    const line = card.querySelector(".titleCard--metadataWrapper .videoMetadata--line");
    const after = line && notOurs(line).at(-1);
    if (!after) return null;
    if (line.style.width !== "100%") line.style.width = "100%";
    return { after, like: line, fit: { size: 36, margin: "0 0 0 auto", order: 99 } };
  };

  globalThis.Lorestep.adapter({
    platform: "netflix",
    links: 'a[href*="jbv="], a[href*="/title/"], a[href*="/watch/"]',
    cards: {
      selector: CARDS,
      title: (c) => c.getAttribute("aria-label") || c.querySelector("img[alt]")?.alt || "",
      id: trackedId,
    },
    match(url) {
      const j = jbv(url);
      if (j) return j;
      const m = PATH.exec(url.pathname);
      return m && { id: m[1] };
    },
    detail(url) {
      const j = jbv(url);
      if (j) return j;
      const m = TITLE.exec(url.pathname);
      return m && { id: m[1] };
    },
    canonical: (id, url) => `${url.origin}/title/${id}`,
    // The video player: no tiles, constant mutations.
    player: (l) => l.pathname.startsWith("/watch"),
    // Verified live 2026-11-05: the hover card and the details popup share one control row,
    // [data-uia="mini-modal-controls"], each control in its own wrapper; the hover card ends with
    // the expand chevron. Our button goes after Rating (or My List), before the chevron.
    actions: [
      {
        anchor: '[data-uia="mini-modal-controls"]',
        place(row) {
          const like =
            row.querySelector('[data-uia="thumbs-rate-button"]') || row.querySelector('[data-uia^="add-to-my-list"]');
          const after = like && [...row.children].find((c) => c.contains(like));
          return after ? { after, like } : null;
        },
        // The hover card covers its tile: the title is the tile underneath. The details popup
        // puts the title ID in the URL.
        resolve(row, h) {
          const mini = row.closest('[data-uia="modal-motion-container-MINI_MODAL"]');
          return mini ? h.tileUnder(mini) : h.detail();
        },
      },
      // Each "More like this" and collection card gets its own button, for its own title.
      { anchor: CARDS, place: placeOnCard, resolve: (card, h) => h.card(card) },
    ],
  });
})();
