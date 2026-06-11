#!/usr/bin/env node
// Regenerates blog/feed.xml (RSS 2.0) from the blog posts on disk.
//
// Run from the repo root:  node tools/geo/build-feed.js
//
// Pulls title, description, canonical, and datePublished straight out of
// each post's existing markup, so the feed can never disagree with the
// pages. Run after publishing a post, commit the result.

const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const BLOG = path.join(ROOT, "blog");

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

const posts = [];
for (const name of fs.readdirSync(BLOG)) {
  if (!name.endsWith(".html") || name === "index.html") continue;
  const html = fs.readFileSync(path.join(BLOG, name), "utf-8");
  const title = (html.match(/<title>([^<]+)<\/title>/i) || [])[1];
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || [])[1];
  const canonical = (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || [])[1];
  const date = (html.match(/"datePublished":\s*"([^"]+)"/) || [])[1];
  if (!title || !canonical || !date) {
    console.warn(`skip (missing fields): blog/${name}`);
    continue;
  }
  posts.push({ title: title.replace(/\s*\|\s*LUPO\s*$/i, ""), desc: desc || "", canonical, date });
}

posts.sort((a, b) => b.date.localeCompare(a.date));

const items = posts.map((p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(p.canonical)}</link>
      <guid isPermaLink="true">${escapeXml(p.canonical)}</guid>
      <pubDate>${new Date(`${p.date}T09:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeXml(p.desc)}</description>
    </item>`).join("\n");

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>LUPO Blog</title>
    <link>https://lupolabs.ai/blog/</link>
    <atom:link href="https://lupolabs.ai/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Inbound sales, qualification, and the AI inbound SDR. From the team building LUPO.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;

fs.writeFileSync(path.join(BLOG, "feed.xml"), feed);
console.log(`blog/feed.xml written: ${posts.length} posts`);
