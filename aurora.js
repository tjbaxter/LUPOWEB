// Aurora mode — lupolabs.ai theme toggle.
//
// The marketing pages carry a fixed .animated-bg layer (purple/indigo
// radial gradients) at opacity 0.09: the site's subtle dark glow. Aurora
// mode lifts that same layer to 0.8 for the vivid look. One shared
// script: applies the persisted choice, injects the CSS, and mounts a
// small pill toggle into the nav. Default stays dark; choice persists
// per browser via localStorage.
(function () {
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
  }

  // CSS: the mode itself + the toggle pill.
  var style = document.createElement("style");
  style.textContent = [
    ".animated-bg { transition: opacity 1.2s ease, filter 1.2s ease; }",
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
    "  transition: opacity 1.2s ease;",
    "  background-image: url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27280%27%20height=%27280%27%3E%3Cfilter%20id=%27g%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.62%27%20numOctaves=%273%27%20seed=%277%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url%28%23g%29%27/%3E%3C/svg%3E);",
    "  mix-blend-mode: overlay;",
    "}",
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
    "  color: rgba(255,255,255,0.82); padding: 0;",
    "  transition: border-color .2s ease, background .2s ease;",
    "}",
    ".aurora-toggle:hover { border-color: rgba(255,255,255,0.32); background: rgba(255,255,255,0.1); }",
  ].join("\n");
  document.head.appendChild(style);

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

  function mount() {
    ensureGrain();
    if (document.querySelector(".aurora-toggle")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "aurora-toggle";
    btn.setAttribute("aria-label", "Toggle light mode");
    btn.addEventListener("click", function () {
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
