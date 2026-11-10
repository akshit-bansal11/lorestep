/* Lorestep for Chrome UI: the fold on poster tiles, the Lorestep button placed in sites' own control rows,
   the title-page panel (for services without such rows), and the toast.
   Everything renders inside a closed Shadow DOM, so page CSS can't leak in and page scripts
   can't read which state a title holds. Styles are one constructed sheet shared by every tile. */
(() => {
  "use strict";
  const D = globalThis.Lorestep;

  const FONT = `system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;
  const TOKENS = `--bar:#0a0a0a;--panel:#121212;--fg:#f4f4f5;--muted:#a1a1aa;--hover:#1a1a1a;--accent:#60a5fa;--ink:${D.INK};--on:#FFFFFF;--line:rgba(255,255,255,.5);--soft:rgba(42,42,42,.6);--shadow:rgba(0,0,0,.5);--fast:140ms`;
  const STATE_VARS = D.ORDER.map((s) => `[data-s="${s}"]{--st:${D.STATES[s].color}}`).join("");

  const SHARED = `
*{box-sizing:border-box}
${STATE_VARS}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px;padding:3px;border-radius:20px;background:var(--bar)}
.b{all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;min-height:40px;padding:5px 2px;border-radius:999px;color:var(--muted);font:500 11px/1 ${FONT};text-align:center;cursor:pointer;transition:background var(--fast),color var(--fast)}
.b svg{width:16px;height:16px;flex:none;color:var(--c)}
.b span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.b:hover{background:var(--hover);color:var(--fg)}
.b[aria-pressed="true"]{background:var(--accent);color:var(--ink)}
.b[aria-pressed="true"] svg{color:var(--ink)}
.b:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.fold{position:absolute;top:0;right:0;aspect-ratio:1;color:var(--ink);background:linear-gradient(225deg,var(--bar) 0 50%,var(--st,var(--muted)) 50%);filter:drop-shadow(-2px 3px 3px var(--shadow))}
.fold svg{position:absolute;left:12%;bottom:12%;width:38%;height:38%}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}`;

  // Tile overlay: display only, never clickable (so it can't block the site or reveal marks to
  // page scripts through hit-testing). Sizes come from container queries on the tile itself.
  const CARD_CSS = `
:host{all:initial;position:absolute!important;inset:0!important;z-index:3;pointer-events:none!important;${TOKENS}}
${SHARED}
.w{position:absolute;inset:0;container-type:size}
.w:not([data-k]){display:none}
.dim{position:absolute;inset:0}
.w[data-dim][data-s="completed"] .dim{background:rgba(0,0,0,.5)}
.w[data-dim][data-s="hold"] .dim{background:rgba(0,0,0,.3)}
.w[data-dim][data-s="dropped"] .dim{background:rgba(0,0,0,.6)}
.ring{position:absolute;inset:0;border-radius:4px;box-shadow:inset 0 0 0 2px var(--st);display:none}
.w[data-s="watching"] .ring{display:block}
.w .fold{width:clamp(18px,22cqmin,44px);display:none}
.w[data-s] .fold{display:block}`;

  // The Lorestep button, placed inside the site's own control row (next to Play / My List /
  // Watchlist) so it takes its own slot and never covers anything. Its size, border and fill are
  // copied from the neighbouring site button at mount time (--size, --radius, --border, --fill).
  // The menu is a native popover: it renders in the top layer, so no card's overflow or
  // transform can clip it, and it closes on Escape or a click outside by itself.
  const ACTION_CSS = `
:host{all:initial;display:inline-flex!important;align-items:center;flex:none;vertical-align:middle;${TOKENS}}
${SHARED}
.t{all:unset;box-sizing:border-box;display:grid;place-items:center;flex:none;width:var(--size,40px);height:var(--size,40px);border-radius:var(--radius,50%);border:var(--border,1.5px solid var(--line));background:var(--fill,var(--soft));color:var(--on);cursor:pointer;transition:border-color var(--fast),background var(--fast),transform var(--fast)}
.t:hover{border-color:var(--on)}
.t:active{transform:scale(.94)}
.t:focus-visible{outline:2px solid var(--on);outline-offset:2px}
.t[data-s]{background:var(--st);border-color:var(--st);color:var(--ink)}
.t svg{width:50%;height:50%}
.menu{inset:auto;margin:0;padding:6px;width:236px;max-width:calc(100vw - 16px);border-radius:20px;background:var(--panel);box-shadow:0 18px 44px var(--shadow);color:var(--fg);font:400 14px/1.3 ${FONT}}
.menu:popover-open{display:grid;gap:2px}
.mt{padding:6px 8px 8px;margin-bottom:2px;color:var(--muted);font:600 12px/1.3 ${FONT};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mi{all:unset;box-sizing:border-box;display:grid;grid-template-columns:26px 1fr 16px;align-items:center;gap:10px;padding:6px 8px;border-radius:999px;cursor:pointer;color:var(--fg);font:500 14px/1.3 ${FONT}}
.mi:hover,.mi:focus-visible{background:var(--hover)}
.mi:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.c{display:grid;place-items:center;width:26px;height:26px;border-radius:999px;background:var(--c);color:var(--ink)}
.c svg{width:15px;height:15px}
.ok{display:grid;place-items:center;color:var(--fg);visibility:hidden}
.ok svg{width:16px;height:16px}
.mi[aria-checked="true"] .ok{visibility:visible}
.mi.rm{color:var(--muted)}
.mi.rm .c{background:none;color:var(--muted)}
.sep{height:6px}`;

  // Title-page panel, fixed to the corner of the viewport, so it never depends on page layout.
  const DOCK_CSS = `
:host{all:initial;position:fixed!important;right:max(20px,env(safe-area-inset-right,0px));bottom:max(20px,env(safe-area-inset-bottom,0px));z-index:2147483646;${TOKENS}}
:host([hidden]){display:none!important}
${SHARED}
.dk{display:grid;gap:10px;width:min(300px,calc(100vw - 40px));padding:12px;border-radius:20px;background:var(--panel);box-shadow:0 12px 32px var(--shadow);color:var(--fg);font:400 13px/1.4 ${FONT}}
.top{display:flex;align-items:center;gap:8px;min-width:0}
.t{flex:1;min-width:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chip{display:inline-flex;align-items:center;gap:5px;flex:none;padding:4px 9px 4px 6px;border-radius:999px;font:600 12px/1 ${FONT};background:var(--hover);color:var(--muted);white-space:nowrap}
.w[data-s] .chip{background:var(--st);color:var(--ink)}
.chip svg{width:13px;height:13px}
.ic{all:unset;box-sizing:border-box;display:grid;place-items:center;flex:none;width:32px;height:32px;border-radius:999px;color:var(--muted);cursor:pointer}
.ic:hover{background:var(--hover);color:var(--fg)}
.ic:focus-visible,.fab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.ic svg{width:16px;height:16px}
.dk .g{grid-template-columns:repeat(4,minmax(0,1fr))}
.fab{all:unset;box-sizing:border-box;position:relative;display:block;width:48px;height:48px;border-radius:20px;background:var(--panel);box-shadow:0 8px 24px var(--shadow);cursor:pointer;overflow:hidden}
.fab .fold{width:26px}
.w[data-min] .dk,.w:not([data-min]) .fab{display:none}`;

  // Confirmation after a right-click mark: the tile's fold may sit under the site's hover card.
  const TOAST_CSS = `
:host{all:initial;position:fixed!important;left:50%;bottom:max(24px,env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483647;pointer-events:none;${TOKENS}}
:host([hidden]){display:none!important}
${SHARED}
.toast{display:flex;align-items:center;gap:8px;max-width:min(440px,calc(100vw - 40px));padding:8px 14px 8px 8px;border-radius:999px;background:var(--panel);box-shadow:0 12px 32px var(--shadow);color:var(--fg);font:500 13px/1.3 ${FONT}}
.ico{display:grid;place-items:center;flex:none;width:24px;height:24px;border-radius:999px;background:var(--st,var(--hover));color:var(--ink)}
.toast:not([data-s]) .ico{color:var(--muted)}
.ico svg{width:14px;height:14px}
.msg{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`;

  const sheets = new Map();
  /** One parsed stylesheet per kind, shared by every shadow root (fast, and exempt from page CSP). */
  const adopt = (root, css) => {
    try {
      if (!sheets.has(css)) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        sheets.set(css, sheet);
      }
      root.adoptedStyleSheets = [sheets.get(css)];
    } catch {
      const style = document.createElement("style");
      style.textContent = css;
      root.append(style);
    }
  };

  const el = (tag, cls) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  };

  // Stopping these at our boundary means a click on a button marks the title and never reaches
  // the site: no opened title, dragged carousel, or started preview.
  const STOP = [
    "click",
    "dblclick",
    "auxclick",
    "contextmenu",
    "mousedown",
    "mouseup",
    "pointerdown",
    "pointerup",
    "touchstart",
    "touchend",
    "keydown",
    "keyup",
  ];
  const CANCEL = new Set(["click", "dblclick", "auxclick", "contextmenu"]);
  // cancel: also cancel default actions. Needed where our UI sits inside a site link; must be off
  // for the action button, whose own default action is opening its popover.
  const fence = (node, { cancel = true } = {}) => {
    for (const type of STOP) {
      node.addEventListener(
        type,
        (e) => {
          e.stopPropagation();
          if (cancel && CANCEL.has(type)) e.preventDefault();
          // A held Enter would re-activate whichever button is rebuilt into its place.
          if (type === "keydown" && e.repeat) e.preventDefault();
        },
        type.startsWith("touch") ? { passive: true } : undefined,
      );
    }
  };

  // Each click rebuilds the buttons under the pointer. One gesture must make one change: drop
  // the second click of a double-click and anything within LOCK_MS of the last accepted click.
  const LOCK_MS = 400;
  const makeGate = () => {
    let until = 0;
    return (e) => {
      if (!e.isTrusted || e.detail > 1) return false;
      const now = performance.now();
      if (now < until) return false;
      until = now + LOCK_MS;
      return true;
    };
  };

  /**
   * Fills a button group.
   * mode "next": the three moves from the current state. mode "all": every state, plus Clear.
   */
  const fillGroup = (g, state, all, { title, focusable, toggle }) => {
    const items = all
      ? [...D.ORDER.map((s) => [D.STATES[s].short, s]), ...(state ? [["Clear", null]] : [])]
      : D.NEXT[state || "none"];
    const name = title || "this title";
    const buttons = items.map(([label, to]) => {
      const b = el("button", "b");
      b.type = "button";
      if (!focusable) b.tabIndex = -1;
      b.dataset.to = to || "";
      b.style.setProperty("--c", to ? D.STATES[to].color : "var(--muted)");
      if (all) b.setAttribute("aria-pressed", String(to === state));
      b.setAttribute("aria-label", to ? `Mark ${name} as ${D.STATES[to].name}` : `Remove the mark from ${name}`);
      const span = el("span");
      span.textContent = label;
      b.append(D.icon(to || "clear"), span);
      return b;
    });
    if (toggle) {
      const b = el("button", "b");
      b.type = "button";
      b.dataset.toggle = "";
      b.style.setProperty("--c", "var(--muted)");
      b.setAttribute("aria-expanded", String(all));
      b.setAttribute("aria-label", all ? "Show fewer options" : "Show all five states");
      const span = el("span");
      span.textContent = all ? "Less" : "More";
      b.append(D.icon("more"), span);
      buttons.push(b);
    }
    g.replaceChildren(...buttons);
  };

  const view = (info) => {
    const e = info ? D.store.resolve(info.key, info.title) : null;
    return { state: e?.s || "", title: info?.title || e?.title || "" };
  };

  /**
   * Mounts the display overlay (fold, ring, dimming) on one tile element. Returns a handle the
   * scanner keeps: update(info) points it at a (possibly different) title, paint() redraws from
   * the store.
   */
  D.mountCard = (target) => {
    const host = document.createElement("lorestep-mark");
    const root = host.attachShadow({ mode: "closed" });
    adopt(root, CARD_CSS);
    const w = el("div", "w");
    const fold = el("div", "fold");
    const sr = el("span", "sr");
    fold.setAttribute("aria-hidden", "true");
    w.append(el("div", "dim"), el("div", "ring"), fold, sr);
    root.append(w);

    let info = null;
    let painted = "";

    const paint = () => {
      const { state } = view(info);
      const dim = D.store.settings().dim;
      const sig = `${info?.key}|${state}|${dim}`;
      if (sig === painted) return;
      painted = sig;
      if (info) w.dataset.k = "";
      else delete w.dataset.k;
      if (state) w.dataset.s = state;
      else delete w.dataset.s;
      w.toggleAttribute("data-dim", dim);
      fold.replaceChildren(...(state ? [D.icon(state)] : []));
      // Read as part of the link's name: "Ashfall Academy, Watching".
      sr.textContent = state ? `, ${D.STATES[state].name}` : "";
    };

    target.append(host);
    return {
      host,
      update(next) {
        info = next;
        paint();
      },
      paint,
    };
  };

  /**
   * Puts the Lorestep button into a site's control row, right after `after`, styled like `like`
   * (the site's own neighbouring button). resolve() names the title; it runs lazily because a
   * hover card can mount before its title is readable. Returns { host, paint }.
   */
  D.mountAction = (after, like, resolve) => {
    const host = document.createElement("lorestep-action");
    // Copy the neighbour's box so ours reads as part of the row. These are plain style values
    // (the same for every title), never anything about the user's list.
    const cs = getComputedStyle(like);
    const side = Math.round(Math.min(Number.parseFloat(cs.height) || 40, Number.parseFloat(cs.width) || 40));
    host.style.setProperty("--size", `${side}px`);
    host.style.setProperty("--radius", cs.borderRadius === "0px" ? "50%" : cs.borderRadius);
    if (Number.parseFloat(cs.borderTopWidth))
      host.style.setProperty("--border", `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`);
    if (cs.backgroundColor !== "rgba(0, 0, 0, 0)") host.style.setProperty("--fill", cs.backgroundColor);
    host.style.margin = getComputedStyle(after).margin; // same spacing as the site's own slots

    const root = host.attachShadow({ mode: "closed" });
    adopt(root, ACTION_CSS);
    const w = el("div", "w");
    const t = el("button", "t");
    t.type = "button";
    t.setAttribute("aria-haspopup", "menu");
    t.setAttribute("aria-expanded", "false");
    const menu = el("div", "menu");
    menu.popover = "auto";
    menu.setAttribute("role", "menu");
    w.append(t, menu);
    root.append(w);
    // Netflix wraps its whole hover card in a link: cancel default actions so a click on our
    // button never navigates. That also cancels a native popover trigger, so the button toggles
    // the menu itself (below).
    fence(w);

    let info = null;
    let painted = "";
    const current = () => {
      if (!info) info = resolve() || null;
      return info;
    };

    const paint = () => {
      const i = current();
      const { state, title } = view(i);
      const sig = `${i?.key}|${state}|${title}`;
      if (sig === painted) return;
      painted = sig;
      if (state) t.dataset.s = state;
      else delete t.dataset.s;
      t.replaceChildren(D.icon(state || "dogear"));
      const name = state ? D.STATES[state].name : "Not marked";
      t.setAttribute("aria-label", `Lorestep${title ? ` for ${title}` : ""}: ${name}`);
      t.title = state ? `Lorestep: ${name}` : "Mark with Lorestep";
    };

    const item = (to, checked, label, cls = "mi") => {
      const b = el("button", cls);
      b.type = "button";
      b.setAttribute("role", to ? "menuitemradio" : "menuitem");
      if (to) b.setAttribute("aria-checked", String(checked));
      b.dataset.to = to || "";
      const c = el("span", "c");
      if (to) c.style.setProperty("--c", D.STATES[to].color);
      c.append(D.icon(to || "clear"));
      const text = el("span");
      text.textContent = label;
      const ok = el("span", "ok");
      ok.append(D.icon("completed"));
      b.append(c, text, ok);
      return b;
    };

    const buildMenu = () => {
      info = resolve() || info; // re-read on every open, so a reused row never marks a stale title
      const { state, title } = view(current());
      const head = el("div", "mt");
      head.setAttribute("role", "presentation");
      head.textContent = title || "This title";
      const rows = D.ORDER.map((s) => item(s, s === state, D.STATES[s].name));
      // Always present, hidden when there's nothing to remove: the menu keeps one size for every
      // state, so its footprint can't be hit-tested by the page to learn the mark.
      const remove = item(null, false, "Remove mark", "mi rm");
      if (!state) {
        remove.style.visibility = "hidden";
        remove.tabIndex = -1;
      }
      const sep = el("div", "sep");
      sep.setAttribute("role", "presentation");
      menu.setAttribute("aria-label", `Mark ${title || "this title"}`);
      menu.replaceChildren(head, ...rows, sep, remove);
      paint();
    };

    // Below the button, or above it when there's no room; always inside the viewport.
    const position = () => {
      const r = t.getBoundingClientRect();
      const mw = menu.offsetWidth;
      const mh = menu.offsetHeight;
      const gap = 8;
      let top = r.bottom + gap;
      if (top + mh > innerHeight - gap) top = Math.max(gap, r.top - gap - mh);
      const left = Math.min(Math.max(gap, r.left), innerWidth - mw - gap);
      menu.style.left = `${Math.round(left)}px`;
      menu.style.top = `${Math.round(top)}px`;
    };

    // The menu closes itself on Escape or a click outside (popover="auto"). A click on our own
    // button counts as "outside": it closes the menu on pointer-down, and the click that follows
    // must not reopen it. closedAt tells the two apart.
    let closedAt = 0;
    // The menu is fixed-position: close it when the page scrolls away under it. Listening only
    // while open keeps a closed menu free of window listeners.
    // A site can remove our host with the menu open (no toggle event then): drop the listener.
    const closeOnScroll = () => {
      if (menu.isConnected) menu.hidePopover();
      else removeEventListener("scroll", closeOnScroll, { capture: true });
    };
    menu.addEventListener("toggle", (e) => {
      const open = e.newState === "open";
      t.setAttribute("aria-expanded", String(open));
      if (open) addEventListener("scroll", closeOnScroll, { capture: true, passive: true });
      else {
        closedAt = performance.now();
        removeEventListener("scroll", closeOnScroll, { capture: true });
      }
    });
    t.addEventListener("click", (e) => {
      if (!e.isTrusted) return;
      if (menu.matches(":popover-open")) return menu.hidePopover();
      if (performance.now() - closedAt < 300) return;
      if (!current()) {
        D.toast("Lorestep couldn't tell which title this is. Right-click the poster instead.", null);
        return;
      }
      buildMenu();
      // Show and place in the same task, before the browser paints: positioning later (in the
      // toggle event) let one frame render at the default spot, so the menu jumped into place.
      menu.showPopover();
      position();
      (menu.querySelector('[aria-checked="true"]') || menu.querySelector(".mi"))?.focus({ preventScroll: true });
    });

    const gate = makeGate();
    menu.addEventListener("click", (e) => {
      const b = e.target.closest(".mi");
      if (!b || b.style.visibility === "hidden" || !gate(e)) return;
      const i = current();
      menu.hidePopover();
      t.focus({ preventScroll: true });
      if (i) D.store.set(i.key, b.dataset.to || null, i);
    });
    // Arrow keys move through the items, as in any menu.
    menu.addEventListener("keydown", (e) => {
      const items = [...menu.querySelectorAll(".mi")].filter((b) => b.style.visibility !== "hidden");
      const at = items.indexOf(root.activeElement);
      const go = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[e.key];
      if (go === undefined || !items.length) return;
      e.preventDefault();
      items[(go + items.length) % items.length].focus();
    });

    paint();
    after.after(host);
    return { host, paint, key: () => current()?.key };
  };

  /** A short status message at the bottom of the viewport. state colours the icon, or null. */
  D.toast = (() => {
    const SHOW_MS = 2600;
    let host, box, timer;
    return (text, state) => {
      if (!host) {
        host = document.createElement("lorestep-toast");
        const root = host.attachShadow({ mode: "closed" });
        adopt(root, TOAST_CSS);
        box = el("div", "toast");
        box.setAttribute("role", "status");
        root.append(box);
      }
      // In fullscreen only the fullscreen element's subtree is drawn; a <video> can't hold children.
      const fs = document.fullscreenElement;
      const parent = fs && fs.localName !== "video" ? fs : document.documentElement;
      if (host.parentNode !== parent) parent.append(host);
      if (state) box.dataset.s = state;
      else delete box.dataset.s;
      const ico = el("span", "ico");
      ico.append(D.icon(state || "clear"));
      const msg = el("span", "msg");
      msg.textContent = text;
      box.replaceChildren(ico, msg);
      host.hidden = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        host.hidden = true;
      }, SHOW_MS);
    };
  })();

  /** The title-page panel. One per tab, created on first use. */
  D.dock = (() => {
    let host, w, chip, t, g, live, fab;
    let info = null;
    let all = false;

    const build = () => {
      host = document.createElement("lorestep-dock");
      const root = host.attachShadow({ mode: "closed" });
      adopt(root, DOCK_CSS);
      w = el("div", "w");
      const dk = el("div", "dk");
      dk.setAttribute("role", "region");
      dk.setAttribute("aria-label", "Lorestep");
      const top = el("div", "top");
      chip = el("span", "chip");
      t = el("span", "t");
      const min = el("button", "ic");
      min.type = "button";
      min.setAttribute("aria-label", "Minimise the Lorestep panel");
      min.append(D.icon("minimise"));
      top.append(chip, t, min);
      g = el("div", "g");
      g.setAttribute("role", "group");
      live = el("p", "sr");
      live.setAttribute("aria-live", "polite");
      dk.append(top, g, live);
      fab = el("button", "fab");
      fab.type = "button";
      fab.append(el("span", "fold"));
      w.append(dk, fab);
      root.append(w);
      fence(w);

      const gate = makeGate();
      g.addEventListener("click", async (e) => {
        const b = e.target.closest("button");
        if (!b || !info || !gate(e)) return;
        if (b.hasAttribute("data-toggle")) {
          all = !all;
          paint();
          return;
        }
        all = false;
        const to = b.dataset.to || null;
        const ok = await D.store.set(info.key, to, info);
        live.textContent = !ok
          ? "Couldn't save. Reload the page and try again."
          : to
            ? `Marked as ${D.STATES[to].name}.`
            : "Mark removed.";
        paint();
      });
      w.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && all) {
          all = false;
          paint();
        }
      });
      // Move focus to whichever control replaces the one that just disappeared.
      min.addEventListener("click", (e) => e.isTrusted && D.store.setSettings({ dock: "min" }).then(() => fab.focus()));
      fab.addEventListener(
        "click",
        (e) => e.isTrusted && D.store.setSettings({ dock: "open" }).then(() => min.focus()),
      );
      document.addEventListener("fullscreenchange", sync);
      addEventListener("resize", sync, { passive: true });
      // Playback start/stop doesn't bubble, so listen in the capture phase.
      document.addEventListener("play", sync, true);
      document.addEventListener("pause", sync, true);
    };

    // Hidden while a video fills the window or the screen
    const playingBig = () => {
      if (document.fullscreenElement) return true;
      for (const v of document.querySelectorAll("video")) {
        const r = v.getBoundingClientRect();
        if (r.width > innerWidth * 0.8 && r.height > innerHeight * 0.8) return true;
      }
      return false;
    };

    const sync = () => {
      if (host) host.hidden = !info || playingBig();
    };

    const paint = () => {
      if (!host || !info) return;
      const { state, title } = view(info);
      const name = title || "This title";
      if (state) w.dataset.s = state;
      else delete w.dataset.s;
      w.toggleAttribute("data-min", D.store.settings().dock === "min");
      chip.replaceChildren(...(state ? [D.icon(state)] : []), state ? D.STATES[state].name : "Not marked");
      t.textContent = name;
      t.title = name;
      g.setAttribute("aria-label", `Mark ${name}`);
      fab.setAttribute(
        "aria-label",
        `Open the Lorestep panel. ${name}: ${state ? D.STATES[state].name : "not marked"}`,
      );
      // Keep keyboard focus on the same control (by what it does, not where it sits) across a
      // rebuild; if that control is gone, land on the first button.
      const focused = g.getRootNode().activeElement;
      const had = focused && g.contains(focused);
      const same = had && (focused.hasAttribute("data-toggle") ? "[data-toggle]" : `[data-to="${focused.dataset.to}"]`);
      fillGroup(g, state, all, { title: name, focusable: true, toggle: true });
      if (had) (g.querySelector(same) || g.firstElementChild)?.focus();
      sync();
    };

    return {
      show(next) {
        if (!host) build();
        if (!host.isConnected) document.documentElement.append(host);
        // Rebuilding the buttons under a pointer mid-click would swallow the click.
        // Called on every scan: nothing changed means no work (sync reads video layout).
        // While hidden, re-check: the video that hid the panel can go away without an event.
        if (info?.key === next.key && info.title === next.title) return host.hidden ? sync() : undefined;
        if (info?.key !== next.key) all = false;
        info = next;
        paint();
      },
      hide() {
        info = null;
        sync();
      },
      paint,
      sync,
      destroy() {
        host?.remove();
        info = null;
      },
    };
  })();
})();
