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

  function log() {
    var args = ["[LUPO]"].concat(Array.prototype.slice.call(arguments));
    try { console.log.apply(console, args); } catch (e) {}
  }

  var style = document.createElement("style");
  style.textContent = [
    ".lupo-call-btn {",
    "  position: fixed; bottom: 32px; right: 32px; z-index: 9999;",
    "  display: inline-flex; align-items: center; gap: 12px;",
    "  padding: 14px 22px; border: none; border-radius: 999px;",
    "  background: linear-gradient(135deg, #764ba2 0%, #a78bfa 100%);",
    "  color: white; cursor: pointer;",
    "  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;",
    "  font-size: 15px; font-weight: 600; letter-spacing: -0.01em;",
    "  box-shadow: 0 8px 32px rgba(118, 75, 162, 0.45);",
    "  transition: transform 0.2s ease, box-shadow 0.2s ease;",
    "}",
    ".lupo-call-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 36px rgba(118, 75, 162, 0.55); }",
    ".lupo-call-btn:disabled { opacity: 0.6; cursor: not-allowed; }",
    ".lupo-call-btn[data-state='connecting'] { background: linear-gradient(135deg, #a78bfa 0%, #c4b5fd 100%); cursor: wait; }",
    ".lupo-call-btn[data-state='in-call'] { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); box-shadow: 0 8px 32px rgba(220, 38, 38, 0.45); }",
    ".lupo-call-btn[data-state='rate_limited'], .lupo-call-btn[data-state='unavailable'] { background: rgba(80, 80, 80, 0.85); }",
    ".lupo-call-btn-icon {",
    "  display: inline-flex; align-items: center; justify-content: center;",
    "  width: 30px; height: 30px; border-radius: 50%; background: rgba(255,255,255,0.18);",
    "}",
    ".lupo-call-btn-icon svg { width: 15px; height: 15px; }",
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
    "  .lupo-call-btn { bottom: 56px; right: 16px; padding: 12px 18px; font-size: 14px; }",
    "  .lupo-call-btn-icon { width: 28px; height: 28px; }",
    "  .lupo-call-consent { right: 16px; bottom: 12px; max-width: 220px; font-size: 10px; }",
    "}"
  ].join("\n");
  document.head.appendChild(style);

  var PHONE_ICON = '<span class="lupo-call-btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>';
  var PHONE_OFF_ICON = '<span class="lupo-call-btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-3-2.42M5.66 5.66a16 16 0 0 0 .82 1.93 2 2 0 0 1-.45 2.11L4.78 11M2 2l20 20"/></svg></span>';

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

  function setState(state) {
    btn.setAttribute("data-state", state);
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

  function attach() {
    function inject() {
      document.body.appendChild(btn);
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

  function fetchToken() {
    return fetch(TOKEN_ENDPOINT, {
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
      if (reason === "daily_cap" || reason === "global_concurrency") {
        showToast("Demo is busy right now. Try again in a few minutes.", "error");
      } else if (reason === "ip_rate_limit" || reason === "ip_concurrency") {
        showToast("You've hit the demo limit for now. Try again in about an hour.", "error");
      } else {
        showToast("Demo is rate-limited. Try again later.", "error");
      }
      setState("rate_limited");
      setTimeout(function () { setState("idle"); }, 8000);
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

  // Opportunistic preload — kicks off as soon as the script runs so most
  // users get an instant call. Failure here does NOT lock the button into
  // "Unavailable"; the click handler will retry.
  ensureSDK().then(
    function () { log("SDK preloaded"); },
    function (e) { log("SDK preload failed (will retry on click)", e && e.message); }
  );

  var vapi = null;
  var isInCall = false;

  function bindVapiEvents(instance) {
    instance.on("call-start", function () {
      log("event: call-start");
      isInCall = true;
      setState("in-call");
      showToast("Connected. Say hi to LUPO.", "info");
    });
    instance.on("call-end", function () {
      log("event: call-end");
      isInCall = false;
      setState("idle");
    });
    instance.on("error", function (e) {
      log("event: error", e);
      isInCall = false;
      setState("idle");
      showToast(extractErrorMessage(e), "error");
    });
  }

  btn.addEventListener("click", function () {
    log("click", { state: btn.getAttribute("data-state"), isInCall: isInCall });
    if (isInCall || btn.getAttribute("data-state") === "in-call") {
      if (vapi) { try { vapi.stop(); } catch (e) { log("stop error", e); } }
      return;
    }
    if (btn.getAttribute("data-state") === "connecting") return;
    setState("connecting");

    // ensureSDK() lazy-loads the SDK if the preload failed; if it
    // succeeded, this is a no-op resolving immediately with the cached
    // constructor. Either way, the click triggers a fresh attempt — no
    // page-session-permanent failure modes.
    ensureSDK()
      .then(function (Ctor) {
        return fetchToken().then(function (resp) {
          log("token response", resp.status, resp.body && resp.body.reason);
          if (resp.status !== 200 || !resp.body || !resp.body.token) {
            handleTokenRejection(resp.status, resp.body);
            return;
          }
          var token = resp.body.token;
          var sessionId = resp.body.sessionId;
          var assistantId = resp.body.assistantId;
          if (!vapi) {
            vapi = new Ctor(token);
            bindVapiEvents(vapi);
          } else {
            // Re-construct so the new JWT is used; events re-bind via closure.
            try { vapi.stop(); } catch (e) {}
            vapi = new Ctor(token);
            bindVapiEvents(vapi);
          }
          try {
            var result = vapi.start(assistantId, {
              variableValues: { sessionId: sessionId }
            });
            if (result && typeof result.then === "function") {
              result.then(
                function () { log("start resolved"); },
                function (e) {
                  log("start rejected", e);
                  setState("idle");
                  showToast(extractErrorMessage(e), "error");
                }
              );
            }
          } catch (e) {
            log("start threw", e);
            setState("idle");
            showToast(extractErrorMessage(e), "error");
          }
        });
      })
      .catch(function (err) {
        log("SDK or token failed", err && err.message);
        var msg = (err && err.message) || "";
        // Distinguish SDK-load failure from network/token failure so the
        // toast tells the user what to do. Either way, state goes to idle
        // (NOT unavailable) so the next tap is a fresh attempt.
        if (/All Vapi SDK|vapi_constructor_missing|module|import/i.test(msg)) {
          showToast("Voice SDK couldn't load. Tap again to retry, or check your connection.", "error");
        } else {
          showToast("Could not reach the demo service. Check your network and try again.", "error");
        }
        setState("idle");
      });
  });

  log("ready");
})();
