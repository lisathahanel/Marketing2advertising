import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] || "dist/firimu";
if (!fs.existsSync(root)) throw new Error("Firimu output folder not found: " + root);

let scanned = 0;
let updated = 0;

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
console.log("Firimu unified search injection: scanned " + scanned + " HTML files; updated " + updated + " pages/posts.");
if (updated === 0) throw new Error("No Firimu pages with the existing search box were updated.");