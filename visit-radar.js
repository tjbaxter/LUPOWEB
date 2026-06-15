/*
 * LUPO visitor radar — engagement + per-page journey beacon.
 *
 * Reports an engaged visitor's whole path through lupolabs.ai:
 *   - "visit"    : once, when the visitor first becomes engaged (>5s, or
 *                  scroll / click / keydown) — the rich arrival ping
 *                  (geo + IP + bot/proxy verdict, built server-side).
 *   - "pageview" : on every SUBSEQUENT page load in an engaged session. It
 *                  carries the PREVIOUS page's dwell + max scroll depth, so
 *                  each navigation becomes a Telegram step
 *                  ("→ /pricing/, was on / for 8s, scrolled 60%").
 *   - "exit"     : when the visitor actually leaves the site — closes the
 *                  LAST page's dwell + scroll, plus session totals.
 *
 * Why per-page dwell is reported on the NEXT page's load (not on unload):
 * unload beacons are unreliable (browsers drop ~20%), so each page's stats
 * are sent when the FOLLOWING page loads — a normal, reliable request. Only
 * the final page depends on the best-effort exit beacon.
 *
 * The exit ping is suppressed ONLY for a real same-tab internal navigation
 * (the next page's load will report it). Same-page hash jumps, modified
 * clicks (open-in-new-tab) and external links must NOT suppress it, or the
 * last page's activity would silently vanish.
 *
 * Everything is best-effort and never blocks navigation. Body is text/plain
 * (CORS-safelisted => no preflight => works cross-origin).
 *
 * sessionStorage keys: lupo_vr_sid, lupo_vr_start, lupo_vr_pages,
 * lupo_vr_visit (engaged flag), lupo_vr_pp/pt/ps (previous page path / enter
 * time / max scroll).
 */
(function () {
  "use strict";
  var BASE = "https://app.lupolabs.ai/api/track";
  var SS;
  try { SS = window.sessionStorage; } catch (e) { return; }
  if (!SS) return;

  function get(k) { try { return SS.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { SS.setItem(k, v); } catch (e) {} }

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

  // Scroll progress through the document, 0-100. A page that fits on screen
  // (nothing to scroll) counts as fully seen.
  function scrollPct() {
    var d = document.documentElement;
    var scrollable = d.scrollHeight - d.clientHeight;
    if (scrollable <= 0) return 100;
    return Math.min(100, Math.max(0, Math.round((d.scrollTop / scrollable) * 100)));
  }

  // PostHog session-replay deep link for THIS visitor, so the Telegram arrival
  // ping can offer "watch what they actually did". PostHog loads on the same
  // page (analytics.js); we read its session id once it's ready and build the
  // canonical project URL (numeric project id, the form the dashboard uses).
  // Null until PostHog has loaded — the link is simply omitted in that case.
  function posthogReplayUrl() {
    try {
      var ph = window.posthog;
      if (ph && ph.__loaded && typeof ph.get_session_id === "function") {
        var s = ph.get_session_id();
        if (s) return "https://us.posthog.com/project/438403/replay/" + encodeURIComponent(s);
      }
    } catch (e) {}
    return null;
  }

  var now = Date.now();
  var page = location.pathname;

  var sid = get("lupo_vr_sid");
  if (!sid) {
    sid = now.toString(36) + Math.random().toString(36).slice(2, 9);
    set("lupo_vr_sid", sid);
  }
  var startedAt = Number(get("lupo_vr_start") || 0);
  if (!startedAt) { startedAt = now; set("lupo_vr_start", String(startedAt)); }
  set("lupo_vr_pages", String(Number(get("lupo_vr_pages") || 0) + 1));

  var engaged = get("lupo_vr_visit") === "1";

  // ---- Close out the PREVIOUS page (engaged sessions only) -----------------
  // Reported on this load (reliable), carrying the prior page's dwell + scroll.
  var prevPage = get("lupo_vr_pp");
  var prevEnter = Number(get("lupo_vr_pt") || 0);
  var prevScroll = Number(get("lupo_vr_ps") || 0);
  var isRefresh = prevPage === page; // same path reload => not a new step
  if (engaged && prevPage && !isRefresh) {
    send("/pageview", {
      sid: sid,
      page: page,
      prevPage: prevPage,
      prevDur: prevEnter ? Math.round((now - prevEnter) / 1000) : null,
      prevScroll: prevScroll
    }, false);
  }

  // ---- Register THIS page as the new "previous" for the next load ----------
  // On a refresh (same path) preserve the accrued enter-time + scroll so the
  // dwell clock isn't reset; only start fresh on a genuinely new page.
  var pageEnter = (isRefresh && prevEnter) ? prevEnter : now;
  set("lupo_vr_pp", page);
  set("lupo_vr_pt", String(pageEnter));
  if (!isRefresh) set("lupo_vr_ps", "0");

  // Track max scroll depth on this page; mirror into storage (throttled) so
  // the next load can report it. Continues across a refresh.
  var maxScroll = isRefresh ? prevScroll : 0;
  var scrollTick = false;
  window.addEventListener("scroll", function () {
    if (scrollTick) return;
    scrollTick = true;
    setTimeout(function () {
      scrollTick = false;
      var p = scrollPct();
      if (p > maxScroll) { maxScroll = p; set("lupo_vr_ps", String(maxScroll)); }
    }, 400);
  }, { passive: true });

  // ---- Engaged gate: first "real" moment fires the rich /visit arrival -----
  var visitSent = engaged;
  function fireVisit() {
    if (visitSent) return;
    visitSent = true;
    set("lupo_vr_visit", "1");
    send("/visit", { sid: sid, page: page, ref: document.referrer || null, replay: posthogReplayUrl() }, false);
  }
  setTimeout(fireVisit, 5000);
  window.addEventListener("scroll", fireVisit, { once: true, passive: true });
  window.addEventListener("click", fireVisit, { once: true });
  window.addEventListener("keydown", fireVisit, { once: true });

  // Mark a click as internal navigation ONLY when it will actually unload
  // this tab — a plain left-click on a same-host link to a different URL.
  // Modified clicks (new tab/window), non-primary buttons, target=_blank,
  // same-page hash jumps and external links all leave this page open, so
  // they must NOT suppress the exit ping (that was the bug that lost the
  // last page's activity).
  var internalNav = false;
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    if (a.host !== location.host) return;                 // external => real leave
    if (a.target && a.target !== "_self") return;         // opens elsewhere
    if (a.pathname === location.pathname && a.search === location.search) return; // hash-only / same URL
    internalNav = true;
  }, true);

  // ---- Exit: real site-leave only. Closes the LAST page + session totals ---
  var exitSent = false;
  function fireExit() {
    if (exitSent || !visitSent || internalNav) return;
    exitSent = true;
    send("/exit", {
      sid: sid,
      dur: Math.round((Date.now() - startedAt) / 1000),
      pages: Number(get("lupo_vr_pages") || 1),
      page: page,
      pageDur: Math.round((Date.now() - pageEnter) / 1000),
      scroll: maxScroll
    }, true);
  }
  window.addEventListener("pagehide", fireExit);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") fireExit();
  });

  // Restored from bfcache (Back/Forward): the script doesn't re-run, so
  // re-baseline this page's clock/scroll and re-arm the exit beacon.
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    exitSent = false;
    internalNav = false;
    now = Date.now();
    pageEnter = now;
    maxScroll = 0;
    set("lupo_vr_pt", String(pageEnter));
    set("lupo_vr_ps", "0");
  });
})();
