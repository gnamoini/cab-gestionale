import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(
  join(process.cwd(), "components/document-capture/capture-ingresso-field-hint.tsx"),
  "utf8",
);

assert.doesNotMatch(src, /ring-1 ring-\[color:color-mix\(in_srgb,var\(--cab-warning\)/);
assert.match(src, /focus-within:border-\[color:color-mix\(in_srgb,var\(--cab-primary\)/);
assert.match(src, /focus-visible\]:border-transparent/);
assert.match(src, /footer\?: ReactNode/);

console.log("capture-hint-chrome-audit.test.ts OK");
