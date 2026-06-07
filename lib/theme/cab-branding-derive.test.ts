import assert from "node:assert/strict";
import { derivePrimaryHover, contrastRatio } from "@/lib/theme/cab-branding-derive";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";

{
  const hover = derivePrimaryHover("#ff6633");
  assert.equal(hover, "#e05a2d");
}

{
  assert.equal(normalizeHex("#F00"), "#ff0000");
  assert.equal(normalizeHex("invalid"), null);
}

{
  const ratio = contrastRatio("#ff6633", "#ffffff");
  assert.ok(ratio > 2);
}

console.log("cab-branding-derive.test.ts: ok");
