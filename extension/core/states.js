/* Lorestep for Chrome: the five states, their glyphs, the three moves each state offers, and the
   supported services. Loaded first by every content script and by the library page.
   This file is the single source of truth for state colours; CSS reads them from here. */
(() => {
  "use strict";
  globalThis.Lorestep ??= {};
  const D = globalThis.Lorestep;

  D.ORDER = Object.freeze(["watching", "plan", "completed", "hold", "dropped"]);

  // Colours set by the product owner: white watching, grey plan, green completed, yellow on hold,
  // red dropped. INK `#0E1015` on each passes 4.5:1 (17.3, 7.4, 10.1, 12.4, 6.8). The glyph
  // shapes keep white and grey apart, so the two never rely on colour alone.
  D.INK = "#0E1015";
  D.STATES = Object.freeze({
    watching: Object.freeze({ name: "Watching", short: "Watch", color: "#F4F4F5" }),
    plan: Object.freeze({ name: "Plan to Watch", short: "Plan", color: "#A1A1AA" }),
    completed: Object.freeze({ name: "Completed", short: "Done", color: "#3DD68C" }),
    hold: Object.freeze({ name: "On Hold", short: "Hold", color: "#FACC15" }),
    dropped: Object.freeze({ name: "Dropped", short: "Drop", color: "#FF6B5E" }),
  });

  // The three buttons offered from each current state: [label, target state, or null to clear].
  // Every state is at most two clicks from any other.
  D.NEXT = Object.freeze({
    none: [
      ["Plan", "plan"],
      ["Watch", "watching"],
      ["Done", "completed"],
    ],
    plan: [
      ["Watch", "watching"],
      ["Done", "completed"],
      ["Clear", null],
    ],
    watching: [
      ["Done", "completed"],
      ["Hold", "hold"],
      ["Drop", "dropped"],
    ],
    hold: [
      ["Resume", "watching"],
      ["Done", "completed"],
      ["Drop", "dropped"],
    ],
    dropped: [
      ["Retry", "watching"],
      ["Plan", "plan"],
      ["Clear", null],
    ],
    completed: [
      ["Rewatch", "watching"],
      ["Plan", "plan"],
      ["Clear", null],
    ],
  });

  // One icon set, drawn on a 24×24 grid: [path data, filled?]. Shapes differ per state so the
  // meaning never depends on colour alone.
  D.ICONS = Object.freeze({
    plan: [["M6 3.5h12v17l-6-4.2-6 4.2z", false]],
    watching: [["M7.5 4.5l12 7.5-12 7.5z", true]],
    completed: [["M4.5 12.5l4.8 4.8L19.5 7", false]],
    hold: [["M8.5 5v14M15.5 5v14", false]],
    dropped: [["M6 6l12 12M18 6L6 18", false]],
    clear: [
      ["M9 13.5L4.5 9 9 4.5", false],
      ["M4.5 9H14a5.5 5.5 0 0 1 0 11h-3", false],
    ],
    more: [["M5 12h.01M12 12h.01M19 12h.01", false]],
    // The brand mark: a play triangle whose top corner is dog-eared, folded down like a page
    // corner marking your place. The flap is the corner reflected across the fold line.
    dogear: [
      ["M6 8.5V20L20 12L10.5 6.57Z", false],
      ["M6 8.5L10.5 6.57L9.26 11.6Z", true],
    ],
    minimise: [["M5 12h14", false]],
  });

  D.isState = (s) => typeof s === "string" && Object.hasOwn(D.STATES, s);

  const SVG_NS = "http://www.w3.org/2000/svg";
  /** Builds an icon with DOM calls only: no markup parsing anywhere in the extension. */
  D.icon = (name) => {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    for (const [d, filled] of D.ICONS[name]) {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("fill", filled ? "currentColor" : "none");
      p.setAttribute("stroke", "currentColor");
      p.setAttribute("stroke-width", "2.4");
      p.setAttribute("stroke-linecap", "round");
      p.setAttribute("stroke-linejoin", "round");
      svg.append(p);
    }
    return svg;
  };

  // Sync wire format (Lorestep): extension ids to canonical statuses, and back.
  D.WIRE = Object.freeze({
    to: Object.freeze({
      watching: "in_progress",
      plan: "planned",
      completed: "completed",
      hold: "on_hold",
      dropped: "dropped",
    }),
    from: Object.freeze({
      in_progress: "watching",
      planned: "plan",
      completed: "completed",
      on_hold: "hold",
      dropped: "dropped",
    }),
  });

  // Hosts must match manifest.json exactly; scripts/check.mjs enforces it in CI.
  D.PLATFORMS = Object.freeze({
    netflix: Object.freeze({ name: "Netflix", hosts: ["www.netflix.com"] }),
    primevideo: Object.freeze({
      name: "Prime Video",
      hosts: [
        "www.primevideo.com",
        "www.amazon.com",
        "www.amazon.in",
        "www.amazon.co.uk",
        "www.amazon.de",
        "www.amazon.co.jp",
      ],
    }),
    hotstar: Object.freeze({ name: "JioHotstar", hosts: ["www.hotstar.com", "www.jiohotstar.com"] }),
    zee5: Object.freeze({ name: "ZEE5", hosts: ["www.zee5.com"] }),
    hbomax: Object.freeze({ name: "HBO Max", hosts: ["play.hbomax.com", "play.max.com"] }),
    crunchyroll: Object.freeze({ name: "Crunchyroll", hosts: ["www.crunchyroll.com"] }),
    // Not a site: titles pulled from Lorestep with no streaming link are stored as
    // t:lorestep:<entry id>, so title linking shows their state on every service's tiles.
    // No hosts, no adapter, never pushed back (the sync API accepts streaming platforms only).
    lorestep: Object.freeze({ name: "Lorestep", hosts: [] }),
  });

  /** Adapters register here; each content script bundle loads exactly one.
      Required: platform, links (CSS selector for title links), match(URL), detail(URL),
      canonical(id, URL). Optional: names (extra page-title suffixes), title(a), kind(a), and
      actions: { anchor: selector, place(el) -> { after, like } | null, resolve(el, h) -> info }
      to put the Lorestep button in the site's own control rows (h: describe, linkNear, tileUnder,
      detail). Without actions, title pages get the corner panel instead. player(location) ->
      true on the video player page, where scanning stops. pageTitle() -> the title page's own
      name, when document.title is unusable. cards: { selector, title(el) } for tiles that are
      not links: they show a mark found by title, and never write to the store. */
  D.adapters = [];
  D.adapter = (a) => {
    D.adapters.push(Object.freeze(a));
  };
})();
