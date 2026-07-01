// Aurora mode — lupolabs.ai theme toggle.
//
// The marketing pages carry a fixed .animated-bg layer (purple/indigo
// radial gradients) at opacity 0.09: the site's subtle dark glow. Aurora
// mode lifts that same layer to 0.8 for the vivid look. One shared
// script: applies the persisted choice, injects the CSS, and mounts a
// corner toggle button. Default stays dark; choice persists per browser
// via localStorage. Loaded SYNCHRONOUSLY in <head> (it is tiny) so the
// persisted theme is on the html element before first paint: pages
// navigate without a dark flash or a replayed fade.
(function () {
  if (window.__LUPO_AURORA_BOOTED__) return;
  window.__LUPO_AURORA_BOOTED__ = true;
  var KEY = "lupoTheme";
  var root = document.documentElement;

  // The dashboard's exact line-art sun/moon (theme-toggle.tsx), so the
  // site control matches the product.
  var SVG_OPEN =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
    'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="';
  var ICON_SUN = SVG_OPEN + "M12 3v1m0 16v1m-8-9H3m18 0h-1m-2.636-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707 M12 8a4 4 0 100 8 4 4 0 000-8z" + '"/></svg>';
  var ICON_MOON = SVG_OPEN + "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" + '"/></svg>';

  function isAurora() {
    try { return localStorage.getItem(KEY) === "aurora"; } catch (_e) { return false; }
  }

  // Two classes so the toggle never shows the layer's edges mid-spin:
  // .aurora drives the FADES (opacity, filter, grain); .aurora-size drives
  // the inset oversize and only ever changes while the layer sits at its
  // invisible 9%: applied before fading in, removed 1.3s after fading out.
  var sizeTimer = null;
  function apply(on) {
    if (sizeTimer) { clearTimeout(sizeTimer); sizeTimer = null; }
    if (on) {
      // Size (not transitioned) and fade can apply in the same frame; a
      // requestAnimationFrame here would never fire in hidden tabs and
      // leave the toggle half-applied.
      root.classList.add("aurora-size");
      root.classList.add("aurora");
    } else {
      root.classList.remove("aurora");
      sizeTimer = setTimeout(function () { root.classList.remove("aurora-size"); }, 1300);
    }
    var btn = document.querySelector(".aurora-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.innerHTML = on ? ICON_MOON : ICON_SUN;
      btn.title = on ? "Switch to dark mode" : "Switch to light mode";
    }
    // iOS Safari paints the notch/home-indicator chrome with theme-color, NOT
    // the page background. A static value left a black bar in light mode, so we
    // track the theme: aurora purple when light, page-black when dark.
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", on ? "#4c569b" : "#000000");
  }

  // CSS: the mode itself + the toggle pill.
  var style = document.createElement("style");
  style.textContent = [
    // Fades run ONLY on an actual toggle click (html.aurora-anim). Without
    // the gate every page navigation replayed the 1.2s dark-to-light glow:
    // a fresh document starts at the dark values and transitions up. Loaded
    // synchronously in <head>, the persisted theme now paints in its final
    // state on frame one; the toggle adds .aurora-anim to animate.
    "html.aurora-anim .animated-bg, html.aurora-anim .aurora-wash { transition: opacity 1.2s ease, filter 1.2s ease; }",
    // Self-provisioned wash for pages that ship without an .animated-bg
    // layer (how-it-works, sales-operations, faq): same palette, static.
    ".aurora-wash {",
    "  position: fixed; inset: -60%; z-index: -1; pointer-events: none; opacity: 0;",
    "  background: radial-gradient(circle at 20% 50%, #2997ff 0%, transparent 75%),",
    "    radial-gradient(circle at 80% 80%, #764ba2 0%, transparent 75%),",
    "    radial-gradient(circle at 40% 20%, #667eea 0%, transparent 75%);",
    "}",
    "html.aurora .aurora-wash { opacity: 0.85; filter: saturate(0.82) brightness(1.16) contrast(0.9); }",
    // Muted text tiers lift toward white in light mode: the dark-mode
    // greys (#a1a1a6 etc) sink into the bright wash. Every marketing page
    // uses these variable names, so one override covers the site.
    "html.aurora { --text-secondary: rgba(255,255,255,0.84); --text-tertiary: rgba(255,255,255,0.7); --text-dim: rgba(255,255,255,0.52); }",
    "html.aurora .ldb-point-body { color: rgba(255,255,255,0.78); }",
    // Elevation pass: dark surfaces float on the bright wash instead of
    // looking pasted on. Indigo-tinted, never plain black. Dark mode
    // keeps its own flat-on-black look.
    "html.aurora .matrix, html.aurora .packet-mock {",
    "  box-shadow: 0 34px 90px rgba(14,10,48,0.5), 0 10px 28px rgba(14,10,48,0.32), 0 0 0 1px rgba(255,255,255,0.07);",
    "}",
    "html.aurora .tier-card, html.aurora .stat-callout, html.aurora .section-card, html.aurora .faq-item, html.aurora .bottom-cta {",
    "  box-shadow: 0 16px 44px rgba(14,10,48,0.35), 0 4px 14px rgba(14,10,48,0.22);",
    "}",
    // FAQ accordion cards (the /faq page): the near-white translucent
    // surfaces read as flat stacked rectangles on the bright wash. Give
    // them the same dark-glass-floating-on-wash language as every other
    // card. Scoped to .section-inner so pricing's borderless FAQ rows
    // keep their row look.
    "html.aurora .section-inner .faq-item {",
    "  background: rgba(14,14,30,0.34); border-color: rgba(255,255,255,0.13);",
    "  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);",
    "}",
    "html.aurora .section-inner .faq-item[open] {",
    "  background: rgba(22,17,48,0.46); border-color: rgba(196,181,253,0.42);",
    "}",
    "html.aurora .ldb-caption { color: rgba(255,255,255,0.55); }",
    // Eyebrow labels: accent purple (#a78bfa / var(--purple)) disappears
    // into the bright wash. Lift to pale lavender with a whisper of dark
    // glow so they read while keeping the accent character. The two grey
    // eyebrows (#a1a1a6 stat/quote bands) lift to translucent white.
    "html.aurora .section-eyebrow, html.aurora .article-eyebrow, html.aurora .blog-hero-eyebrow, html.aurora .blog-card-eyebrow, html.aurora .blog-index-cta-eyebrow, html.aurora .article-cta-eyebrow, html.aurora .article-related-item-eyebrow {",
    "  color: #ece4ff; text-shadow: 0 1px 10px rgba(22,12,54,0.45);",
    "}",
    // Custom per-section eyebrows and in-card labels carry the SAME accent
    // purple (#a78bfa) as .section-eyebrow and wash out identically on the
    // bright indigo (e.g. the "Security" / "Audit trail" kickers on the
    // "Built to ship to enterprise" trust cards). Same lift, so every
    // uppercase kicker stays legible in light mode, reading on both the wash
    // and the dark floating cards.
    "html.aurora .card-label, html.aurora .mep-eyebrow, html.aurora .mep-label, html.aurora .wts-eyebrow, html.aurora .cap-eyebrow, html.aurora .bi-eyebrow, html.aurora .bi-label, html.aurora .bi-ex-label, html.aurora .slp-eyebrow, html.aurora .fp-eyebrow, html.aurora .tl-eyebrow, html.aurora .sol-label {",
    "  color: #ece4ff; text-shadow: 0 1px 10px rgba(22,12,54,0.45);",
    "}",
    "html.aurora .lst-eyebrow, html.aurora .ltq-eyebrow { color: rgba(255,255,255,0.74); }",
    // Oversize while light mode is active or fading: the bgShift rotation
    // exposes the rectangle's corners once the layer is visible (at 9%
    // nobody ever saw the edges). Size changes only happen at 9% opacity.
    // While light mode is active or fading: oversize AND freeze the layer.
    // The bgShift keyframes rotate and shrink it (scale 0.9); on wide
    // screens the rotated rectangle's corner enters the viewport once per
    // pass, flashing a black triangle. A static layer cannot show edges.
    "html.aurora-size .animated-bg { inset: -60% !important; animation: none !important; }",
    "html.aurora .animated-bg { opacity: 0.85 !important; filter: saturate(0.82) brightness(1.16) contrast(0.9); }",
    // Film grain over the wash, under the content (Warp-style retro-futurist
    // texture). Fades with the wash instead of popping.
    ".aurora-grain {",
    "  position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: 0;",
    "  background-image: url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27280%27%20height=%27280%27%3E%3Cfilter%20id=%27g%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.62%27%20numOctaves=%273%27%20seed=%277%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url%28%23g%29%27/%3E%3C/svg%3E);",
    "  mix-blend-mode: overlay;",
    "}",
    "html.aurora-anim .aurora-grain { transition: opacity 1.2s ease; }",
    "html.aurora .aurora-grain { opacity: 0.52; }",
    // Keep the headline accent legible against the vivid wash: brighten the
    // clipped gradient and float it off the background with a soft shadow.
    "html.aurora .gradient-text {",
    "  filter: brightness(1.55) saturate(0.92) drop-shadow(0 2px 12px rgba(10,8,30,0.5));",
    "}",
    // Fixed at the viewport's top-right corner, OUTSIDE the nav flow:
    // injected nav children reflow the bar on every page load (the bar
    // paints before deferred scripts run), which read as a glitchy
    // reorder on each tab change. position:fixed never shifts anything.
    ".aurora-toggle {",
    "  position: fixed; top: 9px; right: 18px; z-index: 1001;",
    "  width: 34px; height: 34px; border-radius: 999px; cursor: pointer;",
    "  display: flex; align-items: center; justify-content: center;",
    "  border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.05);",
    "  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);",
    "  color: rgba(255,255,255,0.82); padding: 0; user-select: none; -webkit-user-select: none;",
    "  transition: border-color .2s ease, background .2s ease;",
    "}",
    ".aurora-toggle:hover { border-color: rgba(255,255,255,0.32); background: rgba(255,255,255,0.1); }",
    // Mobile: the nav's Sign-in button reaches the viewport edge, so the
    // toggle tucks below the bar instead of colliding with it.
    "@media (max-width: 860px) { .aurora-toggle { top: 62px; right: 12px; width: 32px; height: 32px; } }",
    // Overscroll rubber-band canvas matches the wash instead of flashing
    // black, and opaque dark footers become translucent glass on the wash.
    // CRITICAL: giving html a background stops body's black background from
    // propagating to the canvas, so body would paint opaque black OVER the
    // z:-1 wash and grain (negative-z layers sit beneath in-flow content's
    // backgrounds). Body must go transparent whenever html owns the canvas,
    // or light mode renders as a black page with only the icon flipped.
    "html.aurora-anim body { transition: background-color 1.2s ease; }",
    "html.aurora { background-color: #4c569b; }",
    "html.aurora body { background: transparent !important; }",
    "html.aurora footer, html.aurora .lf-footer { background: rgba(10,12,26,0.35) !important; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }",
  ].join("\n");
  document.head.appendChild(style);

  // Wash layer for pages without their own .animated-bg.
  function ensureWash() {
    if (document.querySelector(".animated-bg") || document.querySelector(".aurora-wash")) return;
    var w = document.createElement("div");
    w.className = "aurora-wash";
    w.setAttribute("aria-hidden", "true");
    if (document.body) document.body.appendChild(w);
  }

  // Grain layer (one per page, sits above .animated-bg, below content).
  function ensureGrain() {
    if (document.querySelector(".aurora-grain")) return;
    var g = document.createElement("div");
    g.className = "aurora-grain";
    g.setAttribute("aria-hidden", "true");
    if (document.body) document.body.appendChild(g);
  }

  // Apply persisted state immediately (CSS transition makes it a fade).
  apply(isAurora());

  // Keep every open page in step with the persisted choice. Without these,
  // a long-lived or bfcache-restored tab keeps whatever theme it painted
  // with, and the next click reads as a random dark/light flip:
  // - storage: the toggle was clicked in ANOTHER tab (fade to match)
  // - pageshow persisted: this page came back from the back/forward cache
  // - visibilitychange: belt-and-braces re-check when the tab is revealed
  function syncFromStore(animate) {
    var on = isAurora();
    if (on === root.classList.contains("aurora")) return;
    if (animate) root.classList.add("aurora-anim");
    apply(on);
  }
  window.addEventListener("storage", function (e) {
    if (!e || e.key === null || e.key === KEY) syncFromStore(true);
  });
  window.addEventListener("pageshow", function (e) {
    if (e && e.persisted) syncFromStore(false);
  });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) syncFromStore(false);
  });

  function mount() {
    ensureWash();
    ensureGrain();
    if (document.querySelector(".aurora-toggle")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "aurora-toggle";
    btn.setAttribute("aria-label", "Toggle light mode");
    // Debounced: a double-click (or mouse chatter) used to fire twice,
    // toggling light on and instantly back off — read as "light mode is
    // broken". One theme change per 400ms.
    var lastToggleAt = 0;
    btn.addEventListener("click", function () {
      var now = Date.now();
      if (now - lastToggleAt < 400) return;
      lastToggleAt = now;
      // Enable the fades only for user-initiated toggles; page loads paint
      // the persisted theme instantly (no re-glow on every navigation).
      root.classList.add("aurora-anim");
      var next = !root.classList.contains("aurora");
      try { localStorage.setItem(KEY, next ? "aurora" : "dark"); } catch (_e) {}
      apply(next);
    });
    document.body.appendChild(btn);
    apply(root.classList.contains("aurora"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
