import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
  scripts?: Record<string, string>;
};
const scripts = Object.values(pkg.scripts ?? {}).join("\n");
assert.doesNotMatch(
  scripts,
  /mezzo-scheda-link-audit/,
  "mezzo-scheda-link-audit must not be wired in npm scripts pre go-live",
);
console.log("defer-mezzo-scheda-audit.test.ts OK");
