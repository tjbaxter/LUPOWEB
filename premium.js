/*
 * LUPO premium layer, scroll-reveal motion.
 *
 * Safe-by-construction: this script ADDS the .reveal (hidden) class
 * itself, so if the script never runs (JS off) nothing is hidden. It
 * bails before hiding anything when prefers-reduced-motion is set or
 * IntersectionObserver is unsupported. A 2.5s fallback force-shows any
 * element that somehow never got observed, so content can never get
 * stranded invisible.
 */
(function () {
  "use strict";
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  var STAGGER = 80;

  function tag(el, i) {
    el.classList.add("reveal");
    if (i) el.style.setProperty("--d", i * STAGGER + "ms");
  }

  document.querySelectorAll("section, .content-section").forEach(function (section) {
    // Intro stack (eyebrow -> heading -> lede), staggered.
    var intro = section.querySelectorAll(
      ":scope > .section-inner > .section-eyebrow, :scope > .section-inner > .section-heading, :scope > .section-inner > .section-lede, :scope > .section-inner > h2, :scope > .section-inner > p, :scope > .section-head > *, :scope > .hero-section-inner > *, :scope > h2, :scope > p"
    );
    intro.forEach(function (el, i) { tag(el, i); });

    // Grids / lists / card rows cascade left to right.
    section.querySelectorAll(
      '[class*="grid"], [class*="cards"], [class*="-list"], .demo-grid, .integrations-grid'
    ).forEach(function (grid) {
      Array.prototype.forEach.call(grid.children, function (child, i) { tag(child, i); });
    });

    // Standalone repeatable items + blocks.
    section.querySelectorAll(
      ".faq-item, .feature-row-item, .tier-card, .roadmap-dogfood, .integrations-logos, .integrations-caption, .pilot-note"
    ).forEach(function (el, i) { tag(el, i % 6); });
  });

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
  );

  var revealed = document.querySelectorAll(".reveal");
  revealed.forEach(function (el) { io.observe(el); });

  // Insurance: nothing stays invisible. Force-show stragglers.
  setTimeout(function () {
    document.querySelectorAll(".reveal:not(.in-view)").forEach(function (el) {
      el.classList.add("in-view");
    });
  }, 2500);
})();
