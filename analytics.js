// Lightweight client analytics stub for lupolabs.ai.
//
// The site references this file on every page (`<script src="/analytics.js" defer>`).
// Before this stub existed, every page request 404'd on it.
//
// This file is intentionally minimal: it exposes a `window.lupoTrack`
// no-op so any inline code that calls it (e.g. form-success handlers)
// can do so without throwing, and it leaves the door open to wire a
// real analytics provider later (Plausible, Fathom, PostHog, etc.)
// without changing every page's <script> tag.
//
// No third-party SDKs are loaded here. No cookies are set. No requests
// are made. Replace this file when adding a real analytics provider
// and update the comment to point at the runbook.

(function () {
  if (typeof window === "undefined") return;

  // Tiny event queue so future analytics can flush historical events
  // captured before the real SDK loaded.
  var queue = [];

  window.lupoTrack = function (eventName, props) {
    if (typeof eventName !== "string" || eventName.length === 0) return;
    queue.push({
      name: eventName,
      props: props && typeof props === "object" ? props : {},
      ts: Date.now(),
      path: window.location && window.location.pathname,
    });
    // Cap memory growth on a long-lived session.
    if (queue.length > 200) queue.shift();
  };

  // Expose the queue for debugging or future flushing. Not part of the
  // public API — do not rely on it from external pages.
  window.__lupoAnalyticsQueue = queue;
})();
