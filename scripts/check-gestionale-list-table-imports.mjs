#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory() && f !== "node_modules" && f !== ".next") walk(p, acc);
    else if (/\.tsx?$/.test(f)) acc.push(p);
  }
  return acc;
}

const bad = [];
for (const abs of walk(path.join(ROOT, "components"))) {
  const c = fs.readFileSync(abs, "utf8");
  if (!c.includes("gestionaleListTableTd")) continue;
  if (/import[^;]*gestionaleListTableTd/.test(c)) continue;
  if (c.includes("const prevTableTd = gestionaleListTableTd")) continue;
  if (c.includes("export const prevTableTd = gestionaleListTableTd")) continue;
  bad.push(path.relative(ROOT, abs).replace(/\\/g, "/"));
}
console.log("Missing gestionaleListTableTd import:", bad.length);
for (const f of bad) console.log(f);
