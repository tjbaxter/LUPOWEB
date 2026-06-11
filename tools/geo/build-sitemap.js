#!/usr/bin/env node
// Regenerates sitemap.xml from the actual pages on disk.
//
// Run from the repo root:  node tools/geo/build-sitemap.js
//
// Sourcing rules:
//   - A page is included iff it has a <link rel="canonical"> tag and no
//     noindex robots meta. The canonical IS the sitemap URL, so the two
//     can never drift apart.
//   - lastmod comes from the file's last git commit date, so freshness
//     signals are real instead of hand-maintained (and stale).
//   - Run this after adding or meaningfully editing any page, commit the
//     result. The IndexNow GitHub Action submits whatever is in here.

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();

const EXCLUDE_DIRS = new Set([
  ".git", ".github", ".netlify", ".claude", "node_modules", "portal",
  "obean", "tools", "scripts", "netlify", "public", "vendor", "assets",
  "logos", "compliancelogos", "smb", "downloads",
]);
const EXCLUDE_FILES = new Set(["login.html"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (entry.name.endsWith(".html")) {
      if (EXCLUDE_FILES.has(entry.name)) continue;
      if (entry.name.startsWith("_archive")) continue;
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function gitLastMod(file) {
  try {
    const out = execSync(`git log -1 --format=%cs -- "${file}"`, {
      cwd: ROOT, encoding: "utf-8",
    }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out;
  } catch {}
  return new Date().toISOString().slice(0, 10);
}

function meta(url) {
  // changefreq / priority by URL shape.
  if (url === "https://lupolabs.ai/") return ["weekly", "1.0"];
  if (url.endsWith("/blog/")) return ["weekly", "0.85"];
  if (url.includes("/blog/")) return ["monthly", "0.7"];
  if (url.includes("/pricing/")) return ["monthly", "0.9"];
  if (url.includes("/compare/")) return ["monthly", "0.8"];
  if (url.includes("/glossary/")) return ["monthly", "0.7"];
  if (url.includes("/integrations/")) return ["monthly", "0.75"];
  if (url.includes("/channels/")) return ["monthly", "0.75"];
  if (/privacy|terms|dpa/.test(url)) return ["yearly", "0.5"];
  return ["monthly", "0.8"];
}

const entries = new Map();
for (const file of walk(ROOT).sort()) {
  const html = fs.readFileSync(file, "utf-8");
  if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) continue;
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  if (!m) {
    console.warn(`skip (no canonical): ${path.relative(ROOT, file)}`);
    continue;
  }
  const url = m[1];
  if (!url.startsWith("https://lupolabs.ai")) continue;
  const rel = path.relative(ROOT, file);
  if (!entries.has(url) || rel.endsWith("index.html")) {
    entries.set(url, { lastmod: gitLastMod(rel), file: rel });
  }
}

const urls = [...entries.keys()].sort((a, b) =>
  a === "https://lupolabs.ai/" ? -1 : b === "https://lupolabs.ai/" ? 1 : a.localeCompare(b));

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
for (const url of urls) {
  const { lastmod } = entries.get(url);
  const [changefreq, priority] = meta(url);
  xml += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
}
xml += `</urlset>\n`;

fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml);
console.log(`sitemap.xml written: ${urls.length} URLs`);
