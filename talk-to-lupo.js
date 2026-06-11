/*
 * Talk to LUPO. Floating call button wired to Vapi via a server-issued JWT.
 *
 * The public Vapi key is no longer in page source. The browser asks our
 * backend (app.lupolabs.ai/api/vapi/web-token) for a 5-minute JWT scoped
 * to the LUPO Demo assistant + lupolabs.ai origin. Vapi enforces those
 * restrictions server-side, so a leaked JWT cannot be replayed from
 * another domain or against another assistant.
 *
 * The backend also rate-limits per IP, caps global concurrency, and
 * blocks new tokens when the daily spend cap is hit. We surface those
 * states via clear toasts.
 */
(function () {
  var TOKEN_ENDPOINT = "https://app.lupolabs.ai/api/vapi/web-token";
  // Hang-up hint. The voice picker means visitors redial seconds after
  // ending a call; without this the server still counts the previous
  // session as active and 429s the next dial. Fired on call-end, error,
  // cancel, orphaned tokens, and pagehide. Fire-and-forget.
  var END_ENDPOINT = "https://app.lupolabs.ai/api/vapi/demo-call-ended";

  // Demo-pack selector. LUPO ships two voice demos publicly:
  //   - "b2b" (default): LUPO talking about LUPO, for SDR/VP Sales
  //     visitors landing on lupolabs.ai/
  //   - "smb": Emma the receptionist at "Park Lane Detailing", for
  //     SMB owners landing on lupolabs.ai/smb (typically from cold
  //     outbound).
  // The choice is page-driven: any page under /smb gets the SMB demo;
  // everything else gets the B2B demo. Buttons can also override by
  // setting `data-lupo-demo="smb"` (or "b2b") on the trigger element
  //, useful if a page needs to host both buttons.
  function detectDemoKey() {
    try {
      var path = (window.location && window.location.pathname) || "";
      if (path.indexOf("/smb") === 0) return "smb";
    } catch (e) {}
    return "b2b";
  }

  function demoKeyForEvent(ev) {
    // Explicit per-button override beats path detection.
    try {
      var t = ev && (ev.currentTarget || ev.target);
      while (t && t !== document) {
        if (t.dataset && t.dataset.lupoDemo) return t.dataset.lupoDemo;
        t = t.parentNode;
      }
    } catch (e) {}
    return detectDemoKey();
  }

  function log() {
    var args = ["[LUPO]"].concat(Array.prototype.slice.call(arguments));
    try { console.log.apply(console, args); } catch (e) {}
  }

  var style = document.createElement("style");
  style.textContent = [
    ".lupo-call-btn {",
    "  position: fixed; bottom: 28px; right: 28px; z-index: 9999;",
    "  display: inline-flex; align-items: center; gap: 10px;",
    "  padding: 12px 22px; border: none; border-radius: 999px;",
    "  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);",
    "  color: white; cursor: pointer;",
    "  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;",
    "  font-size: 14px; font-weight: 500; letter-spacing: -0.015em;",
    "  box-shadow: 0 6px 24px rgba(118, 75, 162, 0.45), 0 1px 3px rgba(118, 75, 162, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.12);",
    "  transition: transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.25s ease, opacity 0.3s ease;",
    "}",
    // FAB retired: the bottom-center chat widget owns the floating slot.
    // Kept in the DOM but hidden so inline [data-lupo-call-trigger] CTAs
    // can still drive voice via .lupo-call-btn.click() + data-state mirror.
    ".lupo-call-btn { display: none !important; }",
    ".lupo-call-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(118, 75, 162, 0.58), 0 2px 6px rgba(118, 75, 162, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.16); }",
    ".lupo-call-btn:disabled { opacity: 0.55; cursor: not-allowed; }",
    ".lupo-call-btn.lupo-hidden { opacity: 0; pointer-events: none; transform: translateY(20px); }",
    ".lupo-call-btn[data-state='connecting'] { background: linear-gradient(135deg, #7e8ff2 0%, #8964b8 100%); cursor: pointer; }",
    ".lupo-call-btn[data-state='in-call'] { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); box-shadow: 0 6px 24px rgba(220, 38, 38, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12); }",
    ".lupo-call-btn[data-state='rate_limited'], .lupo-call-btn[data-state='unavailable'] { background: rgba(80, 80, 80, 0.85); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.40); }",
    ".lupo-call-btn-icon {",
    "  display: inline-flex; align-items: center; justify-content: center;",
    "  width: 18px; height: 18px;",
    "  color: rgba(255, 255, 255, 0.96);",
    "}",
    ".lupo-call-btn-icon svg { width: 17px; height: 17px; }",
    ".lupo-call-consent {",
    "  position: fixed; right: 32px; bottom: 8px; z-index: 9998;",
    "  max-width: 280px; text-align: right;",
    "  font-family: -apple-system, BlinkMacSystemFont, sans-serif;",
    "  font-size: 11px; line-height: 1.4; color: rgba(255, 255, 255, 0.45);",
    "  pointer-events: none;",
    "}",
    "@media (prefers-color-scheme: light) {",
    "  .lupo-call-consent { color: rgba(0, 0, 0, 0.5); }",
    "}",
    ".lupo-toast {",
    "  position: fixed; bottom: 110px; left: 50%; transform: translateX(-50%);",
    "  max-width: 380px; padding: 14px 20px; z-index: 99999;",
    "  background: rgba(20, 20, 20, 0.95); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);",
    "  color: white; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);",
    "  font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; line-height: 1.45;",
    "  box-shadow: 0 12px 40px rgba(0,0,0,0.5); text-align: center;",
    "}",
    ".lupo-toast[data-tone='error'] { border-color: rgba(220, 38, 38, 0.4); }",
    "@media (max-width: 768px) {",
    "  .lupo-call-btn { bottom: 56px; right: 16px; padding: 10px 16px; gap: 8px; font-size: 13px; }",
    "  .lupo-call-btn-icon { width: 16px; height: 16px; }",
    "  .lupo-call-btn-icon svg { width: 15px; height: 15px; }",
    "  .lupo-call-consent { right: 16px; bottom: 12px; max-width: 220px; font-size: 10px; }",
    "}"
  ].join("\n");
  document.head.appendChild(style);

  // Inline [data-lupo-call-trigger] CTA states — canonical copy. Pages no
  // longer need their own mirror script or styles: any button with the
  // attribute gets wiring + these states automatically.
  var triggerStyle = document.createElement("style");
  triggerStyle.textContent = [
    "[data-lupo-call-trigger] { position: relative; overflow: hidden; transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease; }",
    "[data-lupo-call-trigger][data-call-state='connecting'] {",
    "  background: linear-gradient(110deg, rgba(167,139,250,0.10) 0%, rgba(167,139,250,0.30) 50%, rgba(167,139,250,0.10) 100%);",
    "  background-size: 200% 100%; animation: lupoBtnShimmer 1.6s linear infinite;",
    "  border-color: rgba(167,139,250,0.38); color: var(--text-primary, #f5f5f7); cursor: pointer;",
    "}",
    "[data-lupo-call-trigger][data-call-state='connecting']:hover { transform: none; }",
    "[data-lupo-call-trigger][data-call-state='in-call'] {",
    "  background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-color: transparent; color: white;",
    "  box-shadow: 0 0 0 0 rgba(220,38,38,0.55); animation: lupoBtnPulse 1.8s ease-in-out infinite;",
    "}",
    "[data-lupo-call-trigger][data-call-state='in-call']:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(220,38,38,0.4); }",
    "[data-lupo-call-trigger][data-call-state='rate_limited'], [data-lupo-call-trigger][data-call-state='unavailable'] { opacity: 0.55; cursor: not-allowed; }",
    "[data-lupo-call-trigger][data-call-state='rate_limited']:hover, [data-lupo-call-trigger][data-call-state='unavailable']:hover { transform: none; background: transparent; }",
    ".lupo-trigger-spinner { animation: lupoSpin 0.9s linear infinite; }",
    "@keyframes lupoBtnShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }",
    "@keyframes lupoBtnPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.45); } 50% { box-shadow: 0 0 0 10px rgba(220,38,38,0); } }",
    "@keyframes lupoSpin { to { transform: rotate(360deg); } }",
    "@media (prefers-reduced-motion: reduce) {",
    "  [data-lupo-call-trigger][data-call-state='connecting'] { animation: none; background: rgba(167,139,250,0.18); }",
    "  [data-lupo-call-trigger][data-call-state='in-call'] { animation: none; }",
    "  .lupo-trigger-spinner { animation: none; }",
    "}"
  ].join("\n");
  document.head.appendChild(triggerStyle);

  var PHONE_ICON = '<span class="lupo-call-btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>';
  var PHONE_OFF_ICON = '<span class="lupo-call-btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(135deg);"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>';

  function showToast(msg, tone) {
    var existing = document.querySelector(".lupo-toast");
    if (existing) existing.remove();
    var t = document.createElement("div");
    t.className = "lupo-toast";
    t.setAttribute("data-tone", tone || "info");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 6000);
  }

  var btn = document.createElement("button");
  btn.className = "lupo-call-btn";
  btn.setAttribute("data-state", "idle");
  btn.setAttribute("aria-label", "Talk to LUPO live");
  btn.innerHTML = PHONE_ICON + '<span class="lupo-call-btn-label">Talk to LUPO live</span>';

  var triggerEls = [];
  var TRIGGER_PHONE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-3-2.42M5.66 5.66a16 16 0 0 0 .82 1.93 2 2 0 0 1-.45 2.11L4.78 11M2 2l20 20"/></svg>';
  var TRIGGER_SPINNER = '<svg class="lupo-trigger-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';

  function applyTriggerState(state) {
    for (var i = 0; i < triggerEls.length; i++) {
      var t = triggerEls[i];
      if (state === "connecting" || state === "loading") {
        t.setAttribute("data-call-state", "connecting");
        t.innerHTML = TRIGGER_SPINNER + "<span>Connecting\u2026</span>";
        t.title = "Click again to cancel";
      } else if (state === "in-call") {
        t.setAttribute("data-call-state", "in-call");
        t.innerHTML = TRIGGER_PHONE_OFF + "<span>End call</span>";
        t.removeAttribute("title");
      } else if (state === "rate_limited" || state === "unavailable") {
        t.setAttribute("data-call-state", state);
        t.innerHTML = t.getAttribute("data-lupo-original-html");
        t.removeAttribute("title");
      } else {
        t.removeAttribute("data-call-state");
        t.innerHTML = t.getAttribute("data-lupo-original-html");
        t.removeAttribute("title");
      }
    }
  }

  function wireTriggers() {
    var found = document.querySelectorAll("[data-lupo-call-trigger]");
    for (var i = 0; i < found.length; i++) {
      var t = found[i];
      if (t.getAttribute("data-lupo-wired")) continue;
      t.setAttribute("data-lupo-wired", "1");
      if (!t.getAttribute("data-lupo-original-html")) {
        t.setAttribute("data-lupo-original-html", t.innerHTML);
      }
      t.addEventListener("click", function (e) {
        e.preventDefault();
        handleCallButtonClick(e);
      });
      triggerEls.push(t);
    }
    applyTriggerState(btn.getAttribute("data-state") || "idle");
  }

  function setState(state) {
    btn.setAttribute("data-state", state);
    applyTriggerState(state);
    if (state === "idle") {
      btn.disabled = false;
      btn.innerHTML = PHONE_ICON + '<span class="lupo-call-btn-label">Talk to LUPO live</span>';
    } else if (state === "loading") {
      btn.disabled = true;
      btn.innerHTML = PHONE_ICON + '<span class="lupo-call-btn-label">Loading…</span>';
    } else if (state === "connecting") {
      btn.disabled = false;
      btn.innerHTML = PHONE_ICON + '<span class="lupo-call-btn-label">Connecting…</span>';
    } else if (state === "in-call") {
      btn.disabled = false;
      btn.innerHTML = PHONE_OFF_ICON + '<span class="lupo-call-btn-label">End call</span>';
    } else if (state === "rate_limited") {
      btn.disabled = true;
      btn.innerHTML = PHONE_ICON + '<span class="lupo-call-btn-label">Try again later</span>';
    } else if (state === "unavailable") {
      btn.disabled = true;
      btn.innerHTML = PHONE_ICON + '<span class="lupo-call-btn-label">Unavailable</span>';
    }
  }

  // Show/hide the floating widget based on whether the page's primary
  // inline CTA (the first [data-lupo-call-trigger] in document order,
  // which is the hero button on /, /smb, etc.) is currently in the
  // viewport. Avoids the visual redundancy of two "Talk to LUPO live"
  // buttons at hero landing, but once the user scrolls past the hero
  // the floating widget stays visible for the rest of the page (we
  // intentionally do NOT toggle on mid-page or bottom CTAs — that
  // caused a pop-in/out flicker on long pages). During an active call
  // the widget is always visible since it's the End-call control.
  // Pages with no inline triggers (pricing, /about, blog) skip this
  // entirely and the widget stays always-on.
  function setupScrollVisibility() {
    var heroTrigger = document.querySelector('[data-lupo-call-trigger]');
    if (!heroTrigger) return;

    function inViewport(el) {
      var r = el.getBoundingClientRect();
      var h = window.innerHeight || document.documentElement.clientHeight;
      return r.bottom > 0 && r.top < h;
    }

    var heroVisible = inViewport(heroTrigger);

    var hidden;
    function setHidden(h) {
      if (h === hidden) return;
      hidden = h;
      if (h) btn.classList.add('lupo-hidden');
      else btn.classList.remove('lupo-hidden');
    }

    function applyVisibility() {
      var s = btn.getAttribute('data-state') || 'idle';
      if (s === 'connecting' || s === 'in-call' || s === 'loading') {
        setHidden(false); // never hide during/around a call
      } else {
        setHidden(heroVisible); // hide only while the hero CTA is on screen
      }
    }

    applyVisibility(); // sync initial state (avoids a flash)

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.target === heroTrigger) heroVisible = e.isIntersecting;
      });
      applyVisibility();
    }, { threshold: 0 });
    io.observe(heroTrigger);

    var mo = new MutationObserver(applyVisibility);
    mo.observe(btn, { attributes: true, attributeFilter: ['data-state'] });
  }

  function attach() {
    function inject() {
      // Pre-compute initial visibility BEFORE inserting the widget so its
      // first paint is in the final state. If we appended visible and
      // then added .lupo-hidden, the CSS transition would animate a
      // visible->hidden fade on every page load — that's the flash.
      var heroTrigger = document.querySelector('[data-lupo-call-trigger]');
      if (heroTrigger) {
        var r = heroTrigger.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        if (r.bottom > 0 && r.top < vh) btn.classList.add('lupo-hidden');
      }
      document.body.appendChild(btn);
      wireTriggers();
      setupScrollVisibility();
    }
    if (document.body) inject();
    else document.addEventListener("DOMContentLoaded", inject);
  }
  attach();

  function extractErrorMessage(err) {
    if (!err) return "Could not start call.";
    if (typeof err === "string") return err;
    var s = "";
    try { s = JSON.stringify(err); } catch (e) {}
    var msg = err.errorMsg || (err.error && err.error.message) || err.message || s || "Could not start call.";
    if (/permission|denied|notallowed|notallowederror|microphone|getUserMedia/i.test(msg + " " + s)) {
      return "Microphone access required. Allow it in your browser, then try again.";
    }
    if (/network|offline|fetch|websocket/i.test(msg + " " + s)) {
      return "Network blocked the call. Try a different network or disable ad-block, then retry.";
    }
    return msg;
  }

  function fetchToken(demoKey) {
    // Default to b2b when called without context (legacy code paths).
    var key = demoKey === "smb" ? "smb" : "b2b";
    var url = TOKEN_ENDPOINT + "?demo=" + encodeURIComponent(key);
    return fetch(url, {
      method: "POST",
      credentials: "omit",
      headers: { "content-type": "application/json" },
      body: "{}"
    }).then(function (res) {
      return res.json().then(function (body) {
        return { status: res.status, body: body };
      }).catch(function () {
        return { status: res.status, body: {} };
      });
    });
  }

  function handleTokenRejection(status, body) {
    var reason = (body && body.reason) || "";
    if (status === 503 || reason === "disabled") {
      showToast("LUPO demo is offline right now. Try again later.", "error");
      setState("unavailable");
      setTimeout(function () { setState("idle"); }, 5000);
      return;
    }
    if (status === 429) {
      // ip_concurrency is transient — the previous call's slot is still
      // clearing (end-hint or webhook in flight). Say so honestly and
      // recover fast; the old "try again in about an hour" copy on this
      // path was wrong and killed voice shopping.
      if (reason === "ip_concurrency") {
        showToast("Still wrapping up your last call. Give it a few seconds and try again.", "error");
        setState("rate_limited");
        setTimeout(function () {
          if (btn.getAttribute("data-state") === "rate_limited") setState("idle");
        }, 4000);
        return;
      }
      if (reason === "daily_cap" || reason === "global_concurrency") {
        showToast("Demo is busy right now. Try again in a few minutes.", "error");
      } else if (reason === "ip_rate_limit") {
        showToast("You've hit the demo limit for now. Try again in about an hour.", "error");
      } else {
        showToast("Demo is rate-limited. Try again later.", "error");
      }
      setState("rate_limited");
      setTimeout(function () {
        if (btn.getAttribute("data-state") === "rate_limited") setState("idle");
      }, 8000);
      return;
    }
    showToast("Could not start the demo right now. Try again in a moment.", "error");
    setState("idle");
  }

  // CDN fallback list. Some users (uBlock Origin, Brave Shields, NoScript,
  // corporate firewalls, mobile carrier proxies) block esm.sh by default.
  // jsdelivr's +esm endpoint is rarely blocked because it serves jQuery to
  // half the internet. unpkg is the npm registry's own CDN.
  // We try in order until one resolves.
  var SDK_SOURCES = [
    "https://esm.sh/@vapi-ai/web@2.5.2",
    "https://cdn.jsdelivr.net/npm/@vapi-ai/web@2.5.2/+esm",
    "https://unpkg.com/@vapi-ai/web@2.5.2?module"
  ];

  function loadVapiSDK(index) {
    var i = index || 0;
    if (i >= SDK_SOURCES.length) {
      return Promise.reject(new Error("All Vapi SDK sources failed"));
    }
    var src = SDK_SOURCES[i];
    log("loading Vapi Web SDK", src);
    return import(/* @vite-ignore */ src).catch(function (err) {
      log("source failed, trying next", { src: src, err: err && err.message });
      return loadVapiSDK(i + 1);
    });
  }

  // Lazy SDK loader with retry-on-click. If the page-load preload failed
  // (mobile carrier flake, cellular handoff, content-blocker, transient
  // CDN blip), the next click triggers a fresh load attempt rather than
  // showing a permanent "Unavailable" state.
  var VapiCtor = null;
  var sdkPromise = null;

  function ensureSDK() {
    if (VapiCtor) return Promise.resolve(VapiCtor);
    if (sdkPromise) return sdkPromise;
    sdkPromise = loadVapiSDK()
      .then(function (mod) {
        var Ctor = mod && (mod.default || mod.Vapi);
        if (typeof Ctor !== "function") {
          sdkPromise = null; // allow retry
          throw new Error("vapi_constructor_missing");
        }
        VapiCtor = Ctor;
        log("SDK loaded, ready");
        return Ctor;
      })
      .catch(function (err) {
        sdkPromise = null; // clear so next click can retry
        throw err;
      });
    return sdkPromise;
  }

  // Opportunistic preload: kicks off as soon as the script runs so most
  // users get an instant call. Failure here does NOT lock the button into
  // "Unavailable"; the click handler will retry.
  ensureSDK().then(
    function () { log("SDK preloaded"); },
    function (e) { log("SDK preload failed (will retry on click)", e && e.message); }
  );

  var vapi = null;
  var isInCall = false;
  // Session id of the most recent minted token (set on token success,
  // cleared once its end-hint fires). Lets every teardown path free the
  // server-side concurrency slot immediately instead of waiting on
  // Vapi's end-of-call report.
  var currentSessionId = null;

  function notifyCallEnded(sessionId) {
    var sid = sessionId || currentSessionId;
    if (!sid) return;
    if (sid === currentSessionId) currentSessionId = null;
    try {
      // text/plain keeps this a CORS simple request (no preflight) and
      // keepalive lets it survive pagehide. Server parses JSON anyway.
      fetch(END_ENDPOINT, {
        method: "POST",
        credentials: "omit",
        keepalive: true,
        headers: { "content-type": "text/plain" },
        body: JSON.stringify({ sessionId: sid })
      }).catch(function () {});
      log("end hint sent", sid);
    } catch (e) {}
  }

  // Tab closed or navigated away mid-call/mid-dial: the Vapi call dies
  // with the page, so free the slot on the way out.
  window.addEventListener("pagehide", function () {
    if (currentSessionId) notifyCallEnded();
  });
  // Chat -> voice continuity: when the call was escalated from the native
  // chat widget, the widget passes the conversation so far. The transcript
  // is injected as a system message the moment the call connects, so the
  // voice agent continues the SAME conversation instead of starting cold.
  var pendingHandoffContext = null;

  function bindVapiEvents(instance) {
    instance.on("call-start", function () {
      log("event: call-start");
      isInCall = true;
      setState("in-call");
      showToast("Connected. Say hi to LUPO.", "info");
      if (pendingHandoffContext) {
        try {
          instance.send({
            type: "add-message",
            message: { role: "system", content: pendingHandoffContext }
          });
          log("chat handoff context injected");
        } catch (e) {
          log("handoff inject failed", e && e.message);
        }
        pendingHandoffContext = null;
      }
    });
    instance.on("call-end", function () {
      log("event: call-end");
      isInCall = false;
      pendingHandoffContext = null;
      notifyCallEnded();
      setState("idle");
    });
    instance.on("error", function (e) {
      log("event: error", e);
      isInCall = false;
      pendingHandoffContext = null;
      notifyCallEnded();
      setState("idle");
      showToast(extractErrorMessage(e), "error");
    });
  }

  // Core call-start path. Extracted from the click handler so the
  // public LupoVoice API (used by the native chat widget) can invoke
  // exactly the same flow without synthesising a click event.
  //
  // handoff (optional, from the chat widget via LupoVoice.open):
  //   { firstMessage: string, systemContext: string }
  //   - firstMessage overrides the assistant's opening line for THIS call
  //     (deterministic copy composed by the widget, e.g. quoting the
  //     visitor's own words back: "You said 'see it live', so here I am").
  //   - systemContext is the chat transcript, injected on call-start so
  //     the voice agent continues the same conversation. Both optional;
  //     absent -> exactly the standalone call behaviour.
  // Each call attempt gets a generation number. Cancelling (or starting a
  // newer attempt) bumps it, and every async stage of the old attempt
  // checks it before touching state — so a cancelled attempt can never
  // flip the button back to "connecting"/"in-call" seconds later when its
  // token fetch finally resolves.
  var callSeq = 0;

  // Spam friction (server enforces the real per-IP active+hourly caps on
  // the token route and 429s abusers; this just keeps honest users from
  // tripping those caps with rapid connect/cancel loops).
  var lastCancelAt = 0;
  var attemptLog = [];

  function cancelConnecting() {
    lastCancelAt = Date.now();
    callSeq++;
    if (vapi) { try { vapi.stop(); } catch (e) { log("stop error", e); } }
    // If the token had already minted, free its slot; if the fetch is
    // still in flight, the seq-mismatch path below hints the orphan.
    notifyCallEnded();
    setState("idle");
    log("call cancelled while connecting");
  }

  function startCall(demoKey, handoff) {
    if (isInCall || btn.getAttribute("data-state") === "in-call") {
      // Already in a call — treat as a "hang up" toggle, matching click behaviour.
      if (vapi) { try { vapi.stop(); } catch (e) { log("stop error", e); } }
      return;
    }
    if (btn.getAttribute("data-state") === "connecting") return;
    var seq = ++callSeq;
    setState("connecting");

    var key = demoKey === "smb" ? "smb" : "b2b";
    log("demo key", key);

    // Defensive re-validation (lupo-chat.js sanitizes too, but this API
    // is public on window so keep the shape strict here as well).
    var handoffFirstMessage =
      handoff && typeof handoff.firstMessage === "string" && handoff.firstMessage.trim().length > 0
        ? handoff.firstMessage.slice(0, 300)
        : null;
    pendingHandoffContext =
      handoff && typeof handoff.systemContext === "string" && handoff.systemContext.trim().length > 0
        ? handoff.systemContext.slice(0, 2600)
        : null;
    if (handoffFirstMessage || pendingHandoffContext) log("chat handoff received");

    ensureSDK()
      .then(function (Ctor) {
        if (seq !== callSeq) return; // cancelled while the SDK loaded
        return fetchToken(key).then(function (resp) {
          if (seq !== callSeq) {
            // Cancelled while the token minted. The server already
            // recorded an active session for it — release the orphan so
            // it doesn't block the visitor's next dial.
            if (resp && resp.status === 200 && resp.body && resp.body.sessionId) {
              notifyCallEnded(resp.body.sessionId);
            }
            return;
          }
          log("token response", resp.status, resp.body && resp.body.reason);
          if (resp.status !== 200 || !resp.body || !resp.body.token) {
            handleTokenRejection(resp.status, resp.body);
            return;
          }
          var token = resp.body.token;
          var sessionId = resp.body.sessionId;
          var assistantId = resp.body.assistantId;
          currentSessionId = sessionId;
          if (!vapi) {
            vapi = new Ctor(token);
            bindVapiEvents(vapi);
          } else {
            try { vapi.stop(); } catch (e) {}
            vapi = new Ctor(token);
            bindVapiEvents(vapi);
          }
          try {
            var overrides = { variableValues: { sessionId: sessionId } };
            if (handoffFirstMessage) overrides.firstMessage = handoffFirstMessage;
            // Voice picker (homepage "Hear it answer" module). Brand-
            // matching proof: the visitor picks a register, the next call
            // starts with that voice. B2B demo only; default (no stored
            // choice) keeps the assistant's configured voice untouched.
            if (key === "b2b") {
              try {
                var vraw = sessionStorage.getItem("lupoVoice");
                if (vraw) {
                  var vch = JSON.parse(vraw);
                  if (vch && typeof vch.provider === "string" && typeof vch.voiceId === "string") {
                    overrides.voice = { provider: vch.provider, voiceId: vch.voiceId };
                    // 11labs voices need the model pinned: Vapi defaults
                    // to the old eleven_turbo_v2, which is audibly worse.
                    // The pills pin eleven_turbo_v2_5.
                    if (typeof vch.model === "string" && vch.model) {
                      overrides.voice.model = vch.model;
                    }
                    log("voice override", vch.provider, vch.voiceId, vch.model || "");
                  }
                }
              } catch (e) {}
            }
            var result = vapi.start(assistantId, overrides);
            if (result && typeof result.then === "function") {
              result.then(
                function () { log("start resolved"); },
                function (e) {
                  log("start rejected", e);
                  notifyCallEnded();
                  setState("idle");
                  showToast(extractErrorMessage(e), "error");
                }
              );
            }
          } catch (e) {
            log("start threw", e);
            notifyCallEnded();
            setState("idle");
            showToast(extractErrorMessage(e), "error");
          }
        });
      })
      .catch(function (err) {
        if (seq !== callSeq) return; // cancelled; do not clobber newer state
        log("SDK or token failed", err && err.message);
        var msg = (err && err.message) || "";
        if (/All Vapi SDK|vapi_constructor_missing|module|import/i.test(msg)) {
          showToast("Voice SDK couldn't load. Tap again to retry, or check your connection.", "error");
        } else {
          showToast("Could not reach the demo service. Check your network and try again.", "error");
        }
        setState("idle");
      });
  }

  // One click controller for the hidden FAB AND every inline
  // [data-lupo-call-trigger] button: idle starts, connecting CANCELS
  // (click again to abort a dial that hasn't picked up), in-call hangs up.
  function handleCallButtonClick(ev) {
    var state = btn.getAttribute("data-state");
    log("click", { state: state, isInCall: isInCall });
    if (state === "in-call") {
      if (vapi) { try { vapi.stop(); } catch (e) { log("stop error", e); } }
      return;
    }
    if (state === "connecting") {
      cancelConnecting();
      showToast("Call cancelled.");
      return;
    }
    if (state === "loading" || state === "rate_limited" || state === "unavailable") return;
    var now = Date.now();
    // Brief cooldown after a cancel: blocks on/off hammering outright.
    if (now - lastCancelAt < 1200) return;
    // Rolling cap: 8 dial attempts a minute. Voice shopping is the
    // normal case now — six voices tried back to back is legitimate —
    // so the local cap only catches genuine hammering, and the lockout
    // is short. The server's hourly cap is the real ceiling.
    attemptLog = attemptLog.filter(function (t) { return now - t < 60000; });
    if (attemptLog.length >= 8) {
      setState("rate_limited");
      showToast("Too many call attempts. Give it a few seconds.", "error");
      setTimeout(function () {
        if (btn.getAttribute("data-state") === "rate_limited") setState("idle");
      }, 12000);
      return;
    }
    attemptLog.push(now);
    startCall(demoKeyForEvent(ev));
  }

  btn.addEventListener("click", handleCallButtonClick);

  // Public API consumed by the native LUPO chat widget (and any future
  // host-page integrations that want to start a Vapi call without
  // simulating a click). The chat widget's iframe sends a postMessage
  // back to the parent page with type:"open_voice"; the chat bootstrap
  // script (public/widget/lupo-chat.js in mk4) prefers
  // window.LupoVoice.open over poking at the .lupo-call-btn directly.
  //
  // Stable surface (do not break):
  //   - open(demoKey?, handoff?) — start a call. demoKey "b2b" | "smb";
  //                          defaults to whatever the current page implies.
  //                          handoff (optional): {firstMessage, systemContext}
  //                          strings from the chat widget so the voice agent
  //                          continues the chat conversation (see startCall).
  //   - isAvailable()      — returns true once the SDK has resolved and
  //                          the widget is not in an unavailable state.
  //   - getState()         — current data-state attribute value.
  window.LupoVoice = {
    open: function (demoKey, handoff) {
      var key = (demoKey === "smb" || demoKey === "b2b") ? demoKey : detectDemoKey();
      startCall(key, handoff);
    },
    isAvailable: function () {
      var state = btn.getAttribute("data-state");
      return Boolean(VapiCtor) && state !== "unavailable";
    },
    getState: function () {
      return btn.getAttribute("data-state") || "idle";
    }
  };

  log("ready");
})();
