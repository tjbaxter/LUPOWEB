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
    if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
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
    "html.aurora .animated-bg { opacity: 0.52 !important; filter: saturate(0.75) brightness(0.94) contrast(1.03); }",
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
    "  filter: brightness(1.12) saturate(1.05) drop-shadow(0 3px 18px rgba(5,5,18,0.5));",
    "}",
    ".aurora-toggle {",
    "  display: inline-flex; align-items: center; gap: 8px; margin-left: 14px;",
    "  padding: 7px 14px; border-radius: 999px; cursor: pointer;",
    "  border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.05);",
    "  color: rgba(255,255,255,0.75); font-size: 13px; font-weight: 600;",
    "  font-family: inherit; line-height: 1; transition: border-color .2s ease, color .2s ease;",
    "}",
    ".aurora-toggle:hover { color: #fff; border-color: rgba(255,255,255,0.34); }",
    ".aurora-dot {",
    "  width: 10px; height: 10px; border-radius: 999px;",
    "  background: linear-gradient(120deg, #667eea, #764ba2);",
    "  box-shadow: 0 0 2px rgba(118,75,162,0.4); opacity: 0.55; transition: all .25s ease;",
    "}",
    ".aurora-toggle[aria-pressed=\"true\"] .aurora-dot { opacity: 1; box-shadow: 0 0 10px rgba(118,75,162,0.95); }",
    "@media (max-width: 860px) { .aurora-toggle .aurora-label { display: none; } .aurora-toggle { padding: 7px 9px; margin-left: 8px; } }",
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
    var host = document.querySelector(".nav-content") || document.querySelector("nav");
    if (!host) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "aurora-toggle";
    btn.title = "Toggle light mode";
    btn.setAttribute("aria-pressed", isAurora() ? "true" : "false");
    btn.innerHTML = '<span class="aurora-dot" aria-hidden="true"></span><span class="aurora-label">Light</span>';
    btn.addEventListener("click", function () {
      var next = !root.classList.contains("aurora");
      try { localStorage.setItem(KEY, next ? "aurora" : "dark"); } catch (_e) {}
      apply(next);
    });
    host.appendChild(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
