/*
 * LUPO visitor radar — lightweight engagement beacon.
 *
 * Fires a "visit" ping once a visitor is genuinely engaged (stayed >5s, or
 * scrolled / clicked / typed) and an "exit" ping when they leave the site.
 * Both go to app.lupolabs.ai/api/track, which filters bots + Tom's own IP,
 * geolocates the IP, and (if the radar is on) relays to Telegram.
 *
 * Design notes:
 *  - Engaged-only: bots and instant bounces never ping.
 *  - One visit + one exit per browser session (sessionStorage-deduped).
 *  - "Exit" is suppressed when the visitor clicks an internal link (they're
 *    just moving to another LUPO page, not leaving). It is best-effort:
 *    browsers don't guarantee an unload beacon, so some exits won't fire.
 *  - text/plain body => CORS-safelisted => no preflight, works cross-origin.
 */
(function () {
  "use strict";
  var BASE = "https://app.lupolabs.ai/api/track";
  var SS;
  try { SS = window.sessionStorage; } catch (e) { return; }
  if (!SS) return;

  function get(k) { try { return SS.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { SS.setItem(k, v); } catch (e) {} }

  var sid = get("lupo_vr_sid");
  if (!sid) {
    sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    set("lupo_vr_sid", sid);
  }
  var startedAt = Number(get("lupo_vr_start") || 0);
  if (!startedAt) { startedAt = Date.now(); set("lupo_vr_start", String(startedAt)); }
  set("lupo_vr_pages", String(Number(get("lupo_vr_pages") || 0) + 1));

  var visitSent = get("lupo_vr_visit") === "1";
  var exitSent = false;
  var internalNav = false;

  function send(path, body, beacon) {
    try {
      var data = JSON.stringify(body);
      var url = BASE + path;
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([data], { type: "text/plain" }));
      } else {
        fetch(url, {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: data,
          keepalive: true,
          mode: "cors"
        });
      }
    } catch (e) {}
  }

  function fireVisit() {
    if (visitSent) return;
    visitSent = true;
    set("lupo_vr_visit", "1");
    send("/visit", { sid: sid, page: location.pathname, ref: document.referrer || null }, false);
  }

  // Engaged signals.
  setTimeout(fireVisit, 5000);
  window.addEventListener("scroll", fireVisit, { once: true, passive: true });
  window.addEventListener("click", fireVisit, { once: true });
  window.addEventListener("keydown", fireVisit, { once: true });

  // Internal-link clicks => moving within the site, not leaving.
  document.addEventListener("click", function (e) {
    var t = e.target;
    var a = t && t.closest ? t.closest("a[href]") : null;
    if (a && a.host === location.host) internalNav = true;
  }, true);

  function fireExit() {
    if (exitSent || !visitSent || internalNav) return;
    exitSent = true;
    var dur = Math.round((Date.now() - startedAt) / 1000);
    send("/exit", {
      sid: sid,
      dur: dur,
      pages: Number(get("lupo_vr_pages") || 1),
      page: location.pathname
    }, true);
  }

  window.addEventListener("pagehide", fireExit);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") fireExit();
  });
})();
