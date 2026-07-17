import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const eslint = read("eslint.config.mjs");
const index = read("eslint-rules/index.mjs");

for (const rule of [
  "no-select-star",
  "no-heavy-import-in-client",
  "no-ssr-false-prefetched-route",
  "no-img-without-next-image",
]) {
  assert.match(index, new RegExp(rule), `eslint-rules missing ${rule}`);
  assert.match(eslint, new RegExp(`cab-perf/${rule}`), `eslint.config missing cab-perf/${rule}`);
}

assert.match(eslint, /components\/gestionale\/report/);
assert.match(eslint, /src\/services\/\*\*\/\*\.service\.ts/);

console.log("performance-lint-policy.test.ts OK");
