/* Lorestep for Chrome library: every marked title, grouped so one show linked across services is one row.
   Runs as the toolbar popup and, with #tab, as a full page (file pickers close popups). */
(() => {
  "use strict";
  const D = globalThis.Lorestep;
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  // #tab is a full page, not the popup.
  const isTab = location.hash === "#tab";
  const LIMIT = 300; // rows drawn at once; search narrows the rest
  root.classList.toggle("tab", isTab);
  root.style.setProperty("--ink", D.INK);
  for (const s of D.ORDER) root.style.setProperty(`--s-${s}`, D.STATES[s].color);

  let filter = "all";
  let query = "";
  let platform = "";
  let undo = null; // entries removed by the last "Remove", restorable from the status bar

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  for (const [k, p] of Object.entries(D.PLATFORMS)) $("platform").append(new Option(p.name, k));

  const say = (text, { warn = false, action = null } = {}) => {
    const s = $("status");
    const hadFocus = s.contains(document.activeElement);
    s.classList.toggle("warn", warn);
    s.replaceChildren(el("span", "", text));
    // Undo was focused and is now gone: keep focus here rather than dropping it to <body>.
    if (hadFocus && !action) {
      s.tabIndex = -1;
      s.focus();
    }
    if (action) {
      const b = el("button", "ghost", action.label);
      b.type = "button";
      b.addEventListener("click", action.run);
      s.append(b);
      b.focus(); // the row it came from is gone; keep keyboard focus on the Undo control
    }
  };

  /** One row per show: entries linked by title (when linking is on) collapse together. */
  const groups = () => {
    const match = D.store.settings().match;
    const out = new Map();
    for (const [key, e] of D.store.entries()) {
      const k = D.parseKey(key);
      if (!k) continue;
      const id = (match && D.normTitle(e.title)) || key;
      let g = out.get(id);
      if (!g) {
        g = { keys: [], platforms: new Set(), e, key, at: 0 };
        out.set(id, g);
      }
      g.keys.push(key);
      g.platforms.add(k.platform);
      if (e.at >= g.at) Object.assign(g, { e, key, at: e.at });
    }
    return [...out.values()];
  };

  const label = (g) => g.e.title || `Untitled (${D.parseKey(g.key).id})`;

  function row(g) {
    const name = label(g);
    const li = el("li", "row");
    li.dataset.key = g.key;
    li.style.setProperty("--c", D.STATES[g.e.s].color);

    const glyph = el("span", "glyph");
    glyph.append(D.icon(g.e.s));
    glyph.title = D.STATES[g.e.s].name;

    const meta = el("div", "meta");
    const title = g.e.url ? el("a", "title", name) : el("span", "title", name);
    if (g.e.url) {
      title.href = g.e.url; // validated: https and one of the service's own hosts
      title.target = "_blank";
      title.rel = "noopener noreferrer";
    }
    title.title = name;
    const kind = g.e.kind === "movie" ? "Movie" : g.e.kind === "series" ? "Series" : "";
    const where = [...g.platforms].map((p) => D.PLATFORMS[p].name).join(", ");
    meta.append(title, el("span", "sub", [where, kind].filter(Boolean).join(" · ")));

    const pick = document.createElement("select");
    pick.setAttribute("aria-label", `State of ${name}`);
    for (const s of D.ORDER) pick.append(new Option(D.STATES[s].name, s, false, s === g.e.s));
    pick.append(new Option("Remove", ""));
    pick.addEventListener("change", () => change(g, pick.value || null));

    li.append(glyph, meta, pick);
    return li;
  }

  async function change(g, to) {
    if (to) {
      // Setting the newest key carries the change to every linked entry.
      if (!(await D.store.set(g.key, to, { title: g.e.title })))
        say("Couldn't save that change. Try again.", { warn: true });
      return;
    }
    const removed = Object.fromEntries(g.keys.map((k) => [k, D.store.get(k)]).filter(([, e]) => e));
    if (!(await D.store.set(g.key, null, { title: g.e.title }))) {
      say("Couldn't remove that title. Try again.", { warn: true });
      return;
    }
    undo = removed;
    say(`Removed ${label(g)}.`, {
      action: {
        label: "Undo",
        run: async () => {
          // Never overwrite a title that was marked again since it was removed. Restamped: the
          // restore is a change made now, so sync doesn't let the removal win it back.
          const at = Date.now();
          const back = {};
          for (const [k, e] of Object.entries(undo || {})) if (!D.store.get(k)) back[k] = { ...e, at };
          undo = null;
          if (await D.store.writeMany(back)) say(`Restored ${label(g)}.`);
          else say("Couldn't restore it.", { warn: true });
        },
      },
    });
  }

  function render() {
    // Keep focus on the same row's control across a redraw.
    const focusKey = document.activeElement?.closest?.(".row")?.dataset.key;

    const q = D.normTitle(query) || query.trim().toLowerCase();
    const all = groups();
    const scoped = all.filter(
      (g) =>
        (!platform || g.platforms.has(platform)) &&
        (!q || D.normTitle(g.e.title).includes(q) || g.e.title.toLowerCase().includes(q)),
    );
    const counts = { all: scoped.length };
    for (const s of D.ORDER) counts[s] = 0;
    for (const g of scoped) counts[g.e.s]++;

    $("count").textContent = all.length === 1 ? "1 title" : `${all.length} titles`;

    $("tabs").replaceChildren(
      ...[["all", "All"], ...D.ORDER.map((s) => [s, D.STATES[s].name])].map(([k, name]) => {
        const b = el("button");
        b.type = "button";
        b.dataset.filter = k;
        b.setAttribute("aria-pressed", String(filter === k));
        if (k !== "all") {
          const dot = el("span", "dot");
          dot.style.setProperty("--c", D.STATES[k].color);
          b.append(dot);
        }
        b.append(`${name} `, el("span", "n", String(counts[k])));
        return b;
      }),
    );

    const shown = scoped.filter((g) => filter === "all" || g.e.s === filter).sort((a, b) => b.at - a.at);
    const list = $("list");
    if (!all.length) {
      const empty = el("li", "empty");
      empty.append(
        el("strong", "empty-h", "Nothing marked yet"),
        "On Netflix or Prime Video, use the Lorestep button next to Play. On any supported service, right-click a poster and choose Lorestep.",
      );
      list.replaceChildren(empty);
    } else if (!shown.length) {
      list.replaceChildren(el("li", "empty", "No titles match. Clear the search or pick another state."));
    } else {
      list.replaceChildren(...shown.slice(0, LIMIT).map(row));
    }
    $("more").hidden = shown.length <= LIMIT;
    $("more").textContent = `Showing ${LIMIT} of ${shown.length}. Search to find the rest.`;

    $("dim").checked = D.store.settings().dim;
    $("match").checked = D.store.settings().match;

    if (focusKey) list.querySelector(`.row[data-key="${CSS.escape(focusKey)}"] select`)?.focus();
  }

  $("tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-filter]");
    if (!b) return;
    filter = b.dataset.filter;
    render();
    $("tabs").querySelector(`[data-filter="${filter}"]`)?.focus();
  });

  let typing = 0;
  $("q").addEventListener("input", () => {
    clearTimeout(typing);
    typing = setTimeout(() => {
      query = $("q").value;
      render();
    }, 120);
  });
  $("platform").addEventListener("change", () => {
    platform = $("platform").value;
    render();
  });

  const when = (t) => new Date(t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (D.AUTH_STATUS_KEY in changes) loadAccount();
    if (D.SYNC_STATUS_KEY in changes) loadSync();
  });

  const ask = (type, extra = {}) =>
    chrome.runtime.sendMessage({ type, ...extra }).catch((err) => ({ ok: false, error: String(err?.message || err) }));

  // ---------- Lorestep account (background.js signs in; this page never sees the token) ----------

  const ACCOUNT_TEXT = {
    "signed-out": () => "Not signed in to Lorestep. Your list stays in this browser.",
    waiting: () => "Sign in and allow Lorestep for Chrome in the Lorestep window.",
    "signed-in": (s) => (s.email ? `Signed in to Lorestep as ${s.email}.` : "Signed in to Lorestep."),
    denied: () => "Sign-in was denied on Lorestep. Nothing changed.",
    error: () => "Couldn't sign in to Lorestep. Try again.",
  };
  let account = { state: "signed-out" };

  function renderAccount() {
    const s = account;
    const text = Object.hasOwn(ACCOUNT_TEXT, s.state) ? ACCOUNT_TEXT[s.state] : ACCOUNT_TEXT["signed-out"];
    $("account-status").textContent = s.message || text(s);
    const b = $("account-action");
    b.textContent = { "signed-in": "Sign out", waiting: "Cancel sign-in" }[s.state] || "Sign in to Lorestep";
    b.disabled = false;
    $("sync-row").hidden = s.state !== "signed-in";
  }

  function loadAccount() {
    return ask("lorestep:auth-status").then((s) => {
      account = typeof s?.state === "string" ? s : { state: "signed-out" };
      renderAccount();
    });
  }

  $("account-action").addEventListener("click", async () => {
    $("account-action").disabled = true;
    if (account.state === "signed-in" || account.state === "waiting") {
      const r = await ask("lorestep:signout");
      if (r?.ok) say(r.signedOut ? "Signed out of Lorestep in this browser." : "Sign-in cancelled.");
    } else {
      $("account-status").textContent = "Opening the Lorestep sign-in window…";
      await ask("lorestep:signin");
    }
    await loadAccount();
  });

  // ---------- Lorestep sync status (background.js writes sync:status) ----------

  let syncStatus = {};

  function renderSync() {
    const s = syncStatus;
    const failed = s.state === "error";
    const refused = s.rejected ? ` · couldn't sync ${s.rejected} ${s.rejected === 1 ? "title" : "titles"}` : "";
    const waiting = `${s.pending ? ` · ${s.pending} waiting to sync` : ""}${refused}`;
    const line = $("sync-status");
    line.classList.toggle("warn", failed || Boolean(s.rejected));
    line.textContent = failed
      ? `Sync failed: ${s.error}${waiting}`
      : s.at
        ? `Synced with Lorestep ${when(s.at)}${waiting}`
        : `Not synced yet${waiting}.`;
    const b = $("sync-now");
    b.textContent = failed || s.rejected ? "Retry" : "Sync now";
    b.disabled = false;
  }

  function loadSync() {
    return chrome.storage.local.get(D.SYNC_STATUS_KEY).then((r) => {
      syncStatus = r[D.SYNC_STATUS_KEY] || {};
      renderSync();
    });
  }

  $("sync-now").addEventListener("click", async () => {
    $("sync-now").disabled = true;
    $("sync-status").textContent = "Syncing…";
    // Retry also puts back the titles Lorestep refused, for another try.
    await ask("lorestep:sync-now", { manual: true, requeue: Boolean(syncStatus.rejected) });
    // The worker writes sync:status when it finishes; if nothing changed, show the last result.
    setTimeout(renderSync, 15000);
  });

  $("dim").addEventListener("change", () => D.store.setSettings({ dim: $("dim").checked }));
  $("match").addEventListener("change", () => D.store.setSettings({ match: $("match").checked }));

  $("open-tab").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("library/library.html#tab") });
    window.close();
  });

  $("export").addEventListener("click", () => {
    const n = D.store.entries().size;
    const blob = new Blob([D.toExport(D.store.entries())], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lorestep-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    say(n === 1 ? "Exported 1 entry." : `Exported ${n} entries.`);
  });

  $("import").addEventListener("click", () => {
    // A file picker steals focus and closes the popup, so import runs in a tab.
    if (!isTab) {
      chrome.tabs.create({ url: chrome.runtime.getURL("library/library.html#tab") });
      window.close();
      return;
    }
    $("file").click();
  });

  $("file").addEventListener("change", async () => {
    const f = $("file").files[0];
    $("file").value = "";
    if (!f) return;
    if (f.size > D.MAX_IMPORT_BYTES) {
      say("That file is over 20 MB, which is bigger than any Lorestep export. Nothing was imported.", { warn: true });
      return;
    }
    let text;
    try {
      text = await f.text();
    } catch {
      say("Couldn't read that file.", { warn: true });
      return;
    }
    const plan = D.planImport(text, D.store.entries());
    if (plan.error) {
      say(`${plan.error} Nothing was imported.`, { warn: true });
      return;
    }
    const n = Object.keys(plan.writes).length;
    if (n && !(await D.store.writeMany(plan.writes))) {
      say("The import stopped partway. The list shows what was saved; import the file again to finish.", {
        warn: true,
      });
      return;
    }
    const parts = [`Imported ${n} ${n === 1 ? "entry" : "entries"}.`];
    if (plan.older) parts.push(`Kept ${plan.older} where your copy was newer.`);
    if (plan.skipped) parts.push(`Skipped ${plan.skipped} that weren't valid.`);
    say(parts.join(" "));
  });

  // A large import fires one change event per storage chunk: redraw once per frame at most.
  let frame = 0;
  const scheduleRender = () => {
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        render();
      });
  };
  D.store.subscribe(scheduleRender);
  D.store
    .load()
    .then(render)
    .then(loadAccount)
    .then(loadSync)
    .then(() => {
      // Opening the library pulls fresh marks (respecting any backoff). Signed out: nothing.
      if (account.state === "signed-in") ask("lorestep:sync-now");
    })
    .catch((err) => {
      console.error("Lorestep for Chrome: could not load the library", err);
      say("Couldn't read your titles. Close this and open it again.", { warn: true });
    });
})();
