import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] || "dist/firimu";
if (!fs.existsSync(root)) throw new Error("Firimu output folder not found: " + root);

let scanned = 0;
let updated = 0;
let postLinkFunctionsRewritten = 0;
let adsenseLoaderTagsRemoved = 0;

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

const categoryPages = new Set([
  "action.html", "adventure.html", "animation-and-fantasy.html",
  "comedy.html", "crime.html", "horror.html", "sci-fi.html",
  "vj-chris-edwards.html", "vj-emmy.html", "vj-icep.html",
  "vj-jingo.html", "vj-junior.html", "vj-kevo.html",
  "vj-mark.html", "vj-muba.html", "vj-ulio.html"
]);

function replaceRewritePostFunctions(source, replacement) {
  const pattern = /function\s+rewritePostDomain\s*\(\s*postUrl\s*\)\s*\{/g;
  let output = "";
  let cursor = 0;
  let count = 0;
  let match;

  while ((match = pattern.exec(source))) {
    const open = match.index + match[0].lastIndexOf("{");
    let depth = 0;
    let quote = "";
    let escaped = false;
    let lineComment = false;
    let blockComment = false;
    let end = -1;

    for (let i = open; i < source.length; i++) {
      const ch = source[i];
      const next = source[i + 1];
      if (lineComment) { if (ch === "\n") lineComment = false; continue; }
      if (blockComment) { if (ch === "*" && next === "/") { blockComment = false; i++; } continue; }
      if (quote) {
        if (escaped) { escaped = false; continue; }
        if (ch === "\\") { escaped = true; continue; }
        if (ch === quote) quote = "";
        continue;
      }
      if (ch === "/" && next === "/") { lineComment = true; i++; continue; }
      if (ch === "/" && next === "*") { blockComment = true; i++; continue; }
      if (ch === "'" || ch === '"' || ch.charCodeAt(0) === 96) { quote = ch; continue; }
      if (ch === "{") depth++;
      if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
    }

    if (end < 0) throw new Error("Unclosed rewritePostDomain function body");
    output += source.slice(cursor, match.index) + replacement;
    cursor = end + 1;
    count++;
    pattern.lastIndex = end + 1;
  }

  output += source.slice(cursor);
  return { html: output, count };
}

function dedupeAdSenseLoaders(html) {
  const pattern = /<script\\b(?=[^>]*\\bsrc\\s*=\\s*["'][^"']*adsbygoogle\\.js[^"']*["'])[^>]*>\\s*<\\/script>/gi;
  let seen = false;
  let removed = 0;
  const output = html.replace(pattern, tag => {
    if (!seen) {
      seen = true;
      return tag;
    }
    removed++;
    return "";
  });
  return { html: output, removed };
}

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

    // Replace complete function bodies with brace-aware scanning.
    const rewritten = replaceRewritePostFunctions(html, canonicalPostLinkFunction);
    html = rewritten.html;
    postLinkFunctionsRewritten += rewritten.count;

    // Keep one AdSense loader per document; preserve every individual ad unit
    // and its adsbygoogle.push() call.
    const dedupedAds = dedupeAdSenseLoaders(html);
    html = dedupedAds.html;
    adsenseLoaderTagsRemoved += dedupedAds.removed;

    // Category pages retain their own fast, label-specific search and feed UI.
    if (categoryPages.has(path.basename(file).toLowerCase())) {
      fs.writeFileSync(file, html, "utf8");
      continue;
    }

    if (!/id=["']m2a-search-box["']/i.test(html)) {
      if (rewritten.count || dedupedAds.removed) fs.writeFileSync(file, html, "utf8");
      continue;
    }
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
console.log("AdSense loader cleanup: removed " + adsenseLoaderTagsRemoved + " duplicate loader tags while preserving ad units.");
console.log("Firimu unified search injection: scanned " + scanned + " HTML files; updated " + updated + " pages/posts.");
if (postLinkFunctionsRewritten === 0) throw new Error("No existing Firimu feed-link functions were found to rewrite.");
if (updated === 0) throw new Error("No Firimu pages with the existing search box were updated.");