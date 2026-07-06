import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const files = [];

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (["node_modules", ".next", "generated", "docs"].includes(e.name)) continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.(ts|tsx)$/.test(e.name)) files.push(f);
  }
}

for (const d of ["app", "lib", "src"]) {
  if (fs.existsSync(d)) walk(d);
}

const skip = new Set([
  path.join(ROOT, "src/lib/auth/permission-guards.ts"),
  path.join(ROOT, "src/lib/auth/server-permission-guards.ts"),
]);

let changed = 0;
for (const file of files) {
  if (skip.has(file)) continue;
  let s = fs.readFileSync(file, "utf8");
  const orig = s;
  s = s.replace(/verifyServerSectionRead\("ddt"\)/g, 'verifyServerPageRead("preventivi")');
  s = s.replace(/verifyServerSectionRead\("ordini_fornitori"\)/g, 'verifyServerPageRead("preventivi")');
  s = s.replace(/verifyServerSectionWrite\("ddt"\)/g, 'verifyServerPageWrite("preventivi")');
  s = s.replace(/verifyServerSectionWrite\("ordini_fornitori"\)/g, 'verifyServerPageWrite("preventivi")');
  s = s.replace(/verifyServerSectionRead/g, "verifyServerPageRead");
  s = s.replace(/verifyServerSectionWrite/g, "verifyServerPageWrite");
  s = s.replace(/ensureSectionRead/g, "ensurePageRead");
  s = s.replace(/ensureSectionWrite/g, "ensurePageWrite");
  if (s !== orig) {
    fs.writeFileSync(file, s);
    changed++;
  }
}
console.log(`section bridge migration: ${changed} files`);
