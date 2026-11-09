/* Lorestep for Chrome offscreen page. A service worker has no URL.createObjectURL, and a data: URL is capped
   at 2 MB by Chrome, so the backup text becomes a blob URL here. The background opens this page
   only for the duration of one backup and closes it again. */
(() => {
  "use strict";
  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (sender.id !== chrome.runtime.id || msg?.target !== "offscreen") return;
    if (msg.type === "lorestep:blob-url") {
      if (typeof msg.text !== "string") reply({ error: "text must be a string" });
      else reply({ url: URL.createObjectURL(new Blob([msg.text], { type: "application/json" })) });
    } else if (msg.type === "lorestep:revoke") {
      if (typeof msg.url === "string" && msg.url.startsWith("blob:")) URL.revokeObjectURL(msg.url);
      reply({ ok: true });
    }
  });
})();
