// Geo-block: deny page requests from India (IN), mainland China (CN)
// and Macao (MO). Hong Kong (HK) and Taiwan (TW) are NOT blocked.
// Runs at the Netlify edge before the static asset is served.
// Static assets are excluded (see config below) so this only gates
// page navigations and adds zero overhead to images/css/js for the
// rest of the world. Fails OPEN: if edge geo is unavailable we never
// block, so a missing country code can't lock out a legitimate visitor.
//
// Reverse this block at any time by deleting this file (or emptying
// BLOCKED) and committing — Netlify redeploys automatically.

const BLOCKED = new Set(["IN", "CN", "MO"]); // ISO 3166-1 alpha-2 (HK kept)

export default async (request, context) => {
  const code = context.geo?.country?.code;

  if (code && BLOCKED.has(code)) {
    return new Response(BLOCK_PAGE, {
      status: 403,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  // Everyone else: continue to the normal static response.
  return context.next();
};

export const config = {
  path: "/*",
  // Don't run on static assets — only on page navigations.
  excludedPath: [
    "/*.css", "/*.js", "/*.mjs", "/*.map",
    "/*.png", "/*.jpg", "/*.jpeg", "/*.webp", "/*.gif", "/*.svg",
    "/*.ico", "/*.avif",
    "/*.woff", "/*.woff2", "/*.ttf", "/*.otf", "/*.eot",
    "/*.mp4", "/*.webm", "/*.mp3", "/*.wav",
    "/*.json", "/*.xml", "/*.txt", "/*.webmanifest", "/*.pdf",
  ],
};

const BLOCK_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Not available in your region</title>
<style>
  html,body{height:100%;margin:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif;
       background:#000;color:#a1a1a6;display:flex;align-items:center;
       justify-content:center;text-align:center;padding:24px}
  h1{color:#f5f5f7;font-size:22px;font-weight:600;margin:0 0 10px}
  p{font-size:15px;line-height:1.5;margin:0;max-width:420px}
</style>
</head>
<body>
  <div>
    <h1>Not available in your region</h1>
    <p>LUPO is not available in your area. If you believe this is a mistake, contact hello@lupolabs.ai.</p>
  </div>
</body>
</html>`;
