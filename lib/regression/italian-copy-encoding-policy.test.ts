import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SCAN_DIRS = ["components", "context", "src", "lib", "app"];

/** Sequenze mojibake note — non devono comparire in copy UI/commenti TS. */
const FORBIDDEN = [
  "\u251c\xe1", // à corrotto
  "\u251c\xbf", // è corrotto
  "\u251c\xbc", // ì corrotto
  "\u251c\u2563", // ò corrotto
  "\u251c\u2593", // ò corrotto (alt)
  "\u251c\xf9", // × corrotto
  "\xd4\xc7\xaa", // … corrotto
  "\xd4\xc7\xf6", // — corrotto
  "\u252c\xbd", // « corrotto
  "\u252c\u2557", // » corrotto
  "\u252c\xc0", // · corrotto
];

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(name)) continue;
    out.push(full);
  }
}

const files: string[] = [];
for (const dir of SCAN_DIRS) walk(path.join(ROOT, dir), files);

const offenders: string[] = [];
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  for (const seq of FORBIDDEN) {
    if (src.includes(seq)) {
      offenders.push(`${path.relative(ROOT, file)} contains ${JSON.stringify(seq)}`);
    }
  }
}

assert.equal(offenders.length, 0, offenders.join("\n"));
console.log("italian-copy-encoding-policy.test.ts OK");
