/* Lorestep for Chrome scanner: finds poster tiles through the site's adapter, mounts the overlay, keeps it
   right as the site lazy-loads rows and recycles tiles, and drives the title-page panel.
   Loaded last in every content script bundle. */
(() => {
  "use strict";
  const D = globalThis.Lorestep;
  const A = D.adapters[0];
  if (!A || !D.PLATFORMS[A.platform]) return;

  const THROTTLE_MS = 200;
  const TITLE_CACHE_MAX = 5000;
  const aliases = new Set([D.PLATFORMS[A.platform].name, ...(A.names || [])].map((n) => n.toLowerCase()));

  const seen = new WeakMap(); // link element -> { raw, href, mount }
  const mounts = new Set(); // every live tile overlay
  const actionMounts = new Set(); // every Lorestep button in a site's control row
  const titles = new Map(); // key -> title read from a tile, for the title-page panel
  let pending = 0;
  let observer = null;

  /**
   * The poster image for a title link: inside the link, or (Prime Video) beside it, when the
   * link is an empty overlay laid over the image. The parent must hold no other title link,
   * or the image could belong to a neighbouring tile.
   */
  const posterOf = (a) => {
    const inside = a.querySelector("img");
    if (inside) return inside;
    const p = a.parentElement;
    const img = p?.querySelector("img");
    return img && p.querySelectorAll(A.links).length === 1 ? img : null;
  };

  /** The box to draw on: the image's own frame where possible, the link's box otherwise. */
  const pickTarget = (a, img) => {
    const box = a.contains(img) ? a : a.parentElement;
    let el = img.parentElement;
    while (el && el !== box && el.tagName === "PICTURE") el = el.parentElement;
    if (!el || !box.contains(el)) el = box;
    let cs = getComputedStyle(el);
    if (el !== box && (cs.display === "inline" || cs.display === "contents")) {
      el = box;
      cs = getComputedStyle(el);
    }
    return { el, relative: cs.position === "static" };
  };

  // "Netflix", "Prime Video", "Watch on Crunchyroll", "Netflix Official Site": yes.
  // "A Mad Max Saga" on Max: no.
  const namesService = (part) => {
    const p = part.toLowerCase().trim();
    for (const n of aliases) if (p === n || p.endsWith(` on ${n}`) || p === `${n} official site`) return true;
    return false;
  };

  /** A usable title for the current page, or "" if the page only names the service.
      "Watch The Boys - Season 1 | Prime Video" -> "The Boys - Season 1". */
  const pageTitle = () => {
    // document.title first: SPAs update it on navigation, og:title often stays stale.
    for (const raw of [document.title, document.querySelector('meta[property="og:title"]')?.getAttribute("content")]) {
      if (!raw) continue;
      const parts = raw.split(/\s+[|–—-]\s+/);
      while (parts.length > 1 && namesService(parts.at(-1))) parts.pop();
      // Prime's document.title is "Prime Video: The Mongoose": drop a leading "<service>: ".
      const head = /^([^:]{2,30}):\s+/.exec(parts[0]);
      if (head && namesService(head[1])) parts[0] = parts[0].slice(head[0].length);
      const t = D.cleanTitle(parts.join(" - ").replace(/^watch\s+/i, ""));
      if (t && !aliases.has(t.toLowerCase())) return t;
    }
    return "";
  };

  const remember = (key, title) => {
    if (!title) return;
    if (titles.size >= TITLE_CACHE_MAX) titles.clear();
    titles.set(key, title);
  };

  const teardown = () => {
    observer?.disconnect();
    for (const m of mounts) m.host.remove();
    mounts.clear();
    for (const m of actionMounts) m.host.remove();
    actionMounts.clear();
    D.dock.destroy();
    document.removeEventListener("fullscreenchange", schedule);
  };

  /** Title info for a link, or null if it doesn't point at a title. */
  const describe = (a) => {
    let url;
    try {
      url = new URL(a.href);
    } catch {
      return null;
    }
    const m = A.match(url);
    if (!m) return null;
    const key = D.makeKey(A.platform, m.id);
    // Adapter hook first (Prime keeps the title on the card, not the link), then the link's
    // accessible name, then the poster's alt text.
    const title = D.cleanTitle(
      // First non-empty alt: Crunchyroll's first <img> is a blank preview layer (alt="").
      A.title?.(a) ||
        a.getAttribute("aria-label") ||
        [...a.querySelectorAll("img[alt]")].find((i) => i.alt.trim())?.alt ||
        a.getAttribute("title") ||
        "",
    );
    remember(key, title);
    return {
      key,
      title: title || titles.get(key) || "",
      kind: m.kind || A.kind?.(a) || "",
      url: A.canonical(m.id, url),
    };
  };

  /** Title info for the page itself, when it is a title page. */
  const detailInfo = () => {
    let url;
    try {
      url = new URL(location.href);
    } catch {
      return null;
    }
    const m = A.detail(url);
    if (!m) return null;
    const key = D.makeKey(A.platform, m.id);
    const title = titles.get(key) || D.store.get(key)?.title || D.cleanTitle(A.pageTitle?.() || "") || pageTitle();
    return { key, title, kind: m.kind || "", url: A.canonical(m.id, url) };
  };

  // The corner panel is the fallback for services, or pages, where the button can't join the site's rows.
  // Only a row button for *this* title counts (hover cards mount buttons for others). A page
  // must miss its row button on two scans a second apart before the panel shows, so it doesn't
  // flash while the site is still rendering the row.
  let rowless = 0;
  const updateDock = () => {
    const info = detailInfo();
    if (info && A.actions) {
      const inRow = [...actionMounts].some((m) => m.host.isConnected && m.key() === info.key);
      rowless = inRow ? 0 : rowless + 1;
      if (rowless === 1) setTimeout(schedule, 1000);
      if (rowless < 2) return D.dock.hide();
    } else rowless = 0;
    info ? D.dock.show(info) : D.dock.hide();
  };

  /**
   * The title link at a point, even under a hover card (Prime, Netflix): elementsFromPoint lists
   * everything stacked there, the covered tile included.
   */
  const linkAt = (x, y) => {
    for (const el of document.elementsFromPoint(x, y)) {
      const a = el.closest?.("a[href]");
      if (!a || a.closest('[role="menu"], [role="menuitem"]')) continue;
      const info = describe(a);
      if (info) return info;
    }
    return null;
  };

  /** Climbs from el until a container links to exactly one title (two means a whole row). */
  const linkNear = (el) => {
    for (let depth = 0; el && el !== document.body && depth < 10; el = el.parentElement, depth++) {
      const found = new Map();
      for (const a of el.querySelectorAll(A.links)) {
        const info = describe(a);
        if (info) found.set(info.key, info);
        if (found.size > 1) return null;
      }
      if (found.size === 1) return [...found.values()][0];
    }
    return null;
  };

  /** The tile underneath a card that covers it, probed where the artwork sits. */
  const tileUnder = (card) => {
    const r = card.getBoundingClientRect();
    for (const [fx, fy] of [
      [0.5, 0.3],
      [0.5, 0.5],
      [0.3, 0.3],
      [0.7, 0.3],
    ]) {
      const info = linkAt(r.left + r.width * fx, r.top + r.height * fy);
      if (info) return info;
    }
    return null;
  };

  const tileAt = (x, y) => {
    const info = linkAt(x, y);
    if (info) return info;
    const top = document.elementFromPoint(x, y);
    return top ? linkNear(top) : null;
  };

  // ---------- the Lorestep button in the site's own control rows ----------

  const helpers = Object.freeze({ describe, linkNear, tileUnder, detail: detailInfo });

  /** Cheap enough to run on every mutation batch, so the button appears with the hover card. */
  const scanActions = () => {
    if (!A.actions) return;
    for (const anchor of document.querySelectorAll(A.actions.anchor)) {
      const spot = A.actions.place(anchor);
      if (!spot?.after?.parentElement || !spot.like) continue;
      if (spot.after.nextElementSibling?.localName === "lorestep-action") continue;
      // Rows inside a link are fine (Netflix's hover card is one): the button cancels the
      // link's navigation for its own clicks.
      const m = D.mountAction(spot.after, spot.like, () => A.actions.resolve(anchor, helpers));
      actionMounts.add(m);
    }
  };

  function scan() {
    pending = 0;
    if (!D.store.alive()) return teardown();
    prune();

    const fresh = [];
    for (const a of document.querySelectorAll(A.links)) {
      let rec = seen.get(a);
      const raw = a.getAttribute("href");
      // A site can re-render a tile's inner wrapper and drop our overlay with it: remount then.
      const lost = rec?.mount && !rec.mount.host.isConnected;
      if (rec && rec.raw === raw && !lost) continue;
      const href = a.href;
      if (lost) rec = undefined;
      const img = posterOf(a);
      if (!img) continue; // text links and not-yet-loaded tiles; looked at again on the next pass
      // Menu entries (Netflix's notification dropdown) link to titles too, but aren't tiles.
      if (a.closest('[role="menu"], [role="menuitem"]')) continue;
      const info = describe(a);
      if (!info) {
        // A recycled tile now pointing somewhere that isn't a title.
        rec?.mount?.update(null);
        seen.set(a, { raw, href, mount: rec?.mount });
        continue;
      }
      fresh.push({ a, img, raw, href, rec, info });
    }

    // Tiles that aren't links (JioHotstar rows) carry no ID to save under. They only show a mark
    // made elsewhere for the same title, through title linking; marking happens on the title page.
    if (A.cards) {
      for (const c of document.querySelectorAll(A.cards.selector)) {
        if (c.closest("a[href]") || c.querySelector("a[href]")) continue; // the link loop has it
        let rec = seen.get(c);
        const title = D.cleanTitle(A.cards.title(c) || "");
        const lost = rec?.mount && !rec.mount.host.isConnected;
        if (rec && rec.raw === title && !lost) continue;
        if (lost) rec = undefined;
        const img = c.querySelector("img");
        if (!img || !title) continue;
        const info = { key: `~${title}`, title, kind: "", url: "", display: true };
        fresh.push({ a: c, img, raw: title, href: "", rec, info });
      }
    }

    // Read every layout value first, then write, so a pass costs one style recalculation.
    for (const f of fresh) if (!f.rec?.mount) f.target = pickTarget(f.a, f.img);
    for (const f of fresh) {
      let mount = f.rec?.mount;
      if (!mount) {
        if (f.target.relative) f.target.el.style.position = "relative";
        mount = D.mountCard(f.target.el);
        mounts.add(mount);
      }
      // Same key as before the recycle, or a new one: either way it repaints from the store.
      mount.update(f.info);
      seen.set(f.a, { raw: f.raw, href: f.href, mount });
      if (f.info.title && !f.info.display) D.store.fill(f.info.key, f.info);
    }

    updateDock();
  }

  // Throttle, not debounce: sites that mutate constantly (autoplay previews) still get scanned.
  const schedule = () => {
    if (!pending) pending = setTimeout(scan, THROTTLE_MS);
  };

  const prune = () => {
    for (const m of mounts) if (!m.host.isConnected) mounts.delete(m);
    for (const m of actionMounts) if (!m.host.isConnected) actionMounts.delete(m);
  };

  D.store
    .load()
    .then(() => {
      let repaint = 0;
      D.store.subscribe(() => {
        if (!D.store.alive()) return teardown();
        D.dock.paint();
        if (repaint) return;
        repaint = requestAnimationFrame(() => {
          repaint = 0;
          prune();
          // Any change can affect any tile: the same show may sit in five rows, under several IDs.
          for (const m of mounts) m.paint();
          for (const m of actionMounts) m.paint();
        });
      });
      scanActions();
      scan();
      // Our own overlays and the video player mutate constantly; neither needs a rescan.
      const ours = (n) => n.nodeType === 1 && n.localName.startsWith("lorestep-");
      observer = new MutationObserver((recs) => {
        if (document.fullscreenElement || A.player?.(location)) return;
        if (!recs.some((r) => r.type === "attributes" || [...r.addedNodes].some((n) => !ours(n)))) return;
        scanActions();
        schedule();
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        // Link-less cards are told apart by their poster's alt, so a recycled card changes that.
        attributeFilter: A.cards ? ["href", "alt"] : ["href"],
      });
      addEventListener("popstate", schedule);
      document.addEventListener("fullscreenchange", schedule);

      // Right-click menu (background.js). The menu sits above every site overlay, so it works
      // where hover cards make the tile's own buttons unreachable. Remember what was under the
      // pointer when the menu opened; the background script only says which state was picked.
      let menuTarget = null;
      addEventListener(
        "contextmenu",
        (e) => {
          menuTarget = e.isTrusted ? tileAt(e.clientX, e.clientY) || detailInfo() : null;
        },
        { capture: true, passive: true },
      );
      chrome.runtime.onMessage.addListener((msg, sender) => {
        if (sender.id !== chrome.runtime.id || msg?.type !== "lorestep:mark") return;
        const to = msg.state === null ? null : D.isState(msg.state) ? msg.state : undefined;
        const info = menuTarget;
        menuTarget = null;
        if (to === undefined) return;
        if (!info) {
          D.toast("Lorestep couldn't tell which title that was. Right-click the poster itself.", null);
          return;
        }
        const name = info.title || D.store.get(info.key)?.title || "Title";
        D.store.set(info.key, to, info).then((ok) => {
          if (!ok) D.toast("Couldn't save. Reload the page and try again.", null);
          else D.toast(to ? `${name}: ${D.STATES[to].name}` : `${name}: mark removed`, to);
        });
      });
    })
    .catch((err) => console.warn("Lorestep for Chrome: could not start", err));
})();
