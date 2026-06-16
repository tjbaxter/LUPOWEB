// Client analytics for lupolabs.ai — PostHog wiring.
//
// Loaded on every page via `<script src="/analytics.js" defer>`.
//
// Exposes the stable `window.lupoTrack(eventName, props)` contract that
// inline page code (form-success/error handlers, etc.) already calls.
// Underneath, events are forwarded to PostHog and PostHog also autocaptures
// pageviews, clicks and session replays on its own.
//
// With NO key in the CONFIG block this file stays a pure no-op queue — no
// SDK loaded, no cookies, no requests — identical to the original stub.
//
// Project: lupolabs.ai (PostHog project 438403, US Cloud).
//   Key/host live under Settings ▸ Project ▸ Project API Key. The project
//   token is a write-only client key and is safe to ship in public source.

(function () {
  if (typeof window === "undefined") return;

  // ---- CONFIG ---------------------------------------------------------
  var POSTHOG_KEY  = "phc_pj65cTXxEyiDcNQPvdMyxbXWbtEgfUxnosYNcrHR4YLh"; // project 438403
  var POSTHOG_HOST = "https://us.i.posthog.com";                          // EU: https://eu.i.posthog.com
  // ---------------------------------------------------------------------

  // Tiny event buffer kept for debugging and for flushing events captured
  // before the SDK finished loading. Exposed (read-only by convention) as
  // window.__lupoAnalyticsQueue — not a public API, do not rely on it.
  var queue = [];
  window.__lupoAnalyticsQueue = queue;

  function record(eventName, props) {
    if (typeof eventName !== "string" || eventName.length === 0) return null;
    var p = props && typeof props === "object" ? props : {};
    queue.push({ name: eventName, props: p, ts: Date.now(), path: window.location && window.location.pathname });
    if (queue.length > 200) queue.shift(); // cap memory on long sessions
    return p;
  }

  // No key yet → preserve the original safe no-op behaviour exactly.
  if (!POSTHOG_KEY) {
    window.lupoTrack = function (eventName, props) { record(eventName, props); };
    return;
  }

  // PostHog official loader snippet (current version, with the double-load
  // guard). The array stub buffers any capture() calls made before
  // /static/array.js finishes loading, then flushes them.
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="rn sn init kn Qr wn Cn yn capture calculateEventProperties Rn register register_once register_for_session unregister unregister_for_session An getFeatureFlag getFeatureFlagPayload getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync Fn identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty On En createPersonProfile setInternalOrTestUser Ln gn $n opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing In debug Kr Pn getPageViewId captureTraceFeedback captureTraceMetric vn".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: '2026-05-30',              // PostHog's current recommended defaults bundle
    person_profiles: "identified_only",  // cheaper: only create profiles once a form/identify call names a visitor
    capture_pageleave: true,             // time-on-page / bounce
    session_recording: { maskAllInputs: true } // mask email/company in the waitlist form
  });

  // Owner self-exclusion. Visit any page with `?lupo_optout=1` to permanently
  // stop PostHog capturing + session recording on THIS browser — so the
  // owner's own (often hours-long) sessions don't clutter the replay list or
  // burn quota. `?lupo_optout=0` re-enables. PostHog persists the choice in
  // local storage, so on later visits init() respects it from the first byte
  // (no recording at all). One visit per browser/device you use.
  try {
    var optParam = new URLSearchParams(window.location.search).get("lupo_optout");
    if (optParam === "1") posthog.opt_out_capturing();
    else if (optParam === "0") posthog.opt_in_capturing();
  } catch (e) {}

  // Replay anything captured before the SDK was ready, then forward live.
  for (var i = 0; i < queue.length; i++) {
    try { posthog.capture(queue[i].name, queue[i].props); } catch (e) {}
  }

  window.lupoTrack = function (eventName, props) {
    var p = record(eventName, props);
    if (p === null) return;
    try { posthog.capture(eventName, p); } catch (e) {}
  };
})();
