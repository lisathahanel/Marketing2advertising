import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] || "dist/firimu";
if (!fs.existsSync(root)) throw new Error("Firimu output folder not found: " + root);

let scanned = 0;
let updated = 0;
let postLinkFunctionsRewritten = 0;

const canonicalPostLinkFunction = `function rewritePostDomain(postUrl){
  try {
    var parsed = new URL(postUrl);
    parsed.protocol = "https:";
    parsed.hostname = "www.marketing2advertising.com";
    parsed.pathname = parsed.pathname.replace(/^\\/firimu(?=\\/|$)/i, "") || "/";
    return parsed.href;
  } catch(e){
    return postUrl;
  }
}`;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(file);
      continue;
    }
    if (!entry.isFile() || !/\.html?$/i.test(entry.name)) continue;
    scanned++;
    let html = fs.readFileSync(file, "utf8");

    // Make every feed-card link open the original Blogger post on www,
    // without the standalone app's /firimu/ path prefix.
    const rewritePattern = /function\\s+rewritePostDomain\\s*\\(\\s*postUrl\\s*\\)\\s*\\{[\\s\\S]*?\\n\\}/g;
    html = html.replace(rewritePattern, function () {
      postLinkFunctionsRewritten++;
      return canonicalPostLinkFunction;
    });
    if (!/id=["']m2a-search-box["']/i.test(html)) continue;
    if (!/<\/head>/i.test(html)) {
      console.warn("Skipped search injection (no head): " + file);
      continue;
    }
    if (!html.includes("/firimu/m2a-unified-search.css")) {
      const assets = [
        '  <link rel="stylesheet" href="/firimu/m2a-unified-search.css">',
        '  <script defer src="/firimu/m2a-unified-search.js"></script>'
      ].join("\n");
      html = html.replace(/<\/head>/i, assets + "\n</head>");
    }
    fs.writeFileSync(file, html, "utf8");
    updated++;
  }
}

walk(root);
console.log("Firimu feed-link rewrite: updated " + postLinkFunctionsRewritten + " post-link functions to www Blogger URLs without /firimu/.");
console.log("Firimu unified search injection: scanned " + scanned + " HTML files; updated " + updated + " pages/posts.");
if (postLinkFunctionsRewritten === 0) throw new Error("No existing Firimu feed-link functions were found to rewrite.");
if (updated === 0) throw new Error("No Firimu pages with the existing search box were updated.");