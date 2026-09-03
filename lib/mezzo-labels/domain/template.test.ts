import assert from "node:assert/strict";
import {
  MEZZO_LABEL_TEMPLATE,
  mmToPt,
  mezzoLabelGridTemplate,
} from "@/lib/mezzo-labels/domain/template";
import { MM_TO_PT } from "@/lib/mezzo-labels/domain/types";

assert.equal(MEZZO_LABEL_TEMPLATE.widthMm, 36);
assert.equal(MEZZO_LABEL_TEMPLATE.heightMm, 18);
assert.equal(MEZZO_LABEL_TEMPLATE.cutBorderMm, 1);
assert.equal(MEZZO_LABEL_TEMPLATE.qr.maxSizeMm, 13.5);
assert.equal(mmToPt(36), 36 * MM_TO_PT);
assert.equal(mezzoLabelGridTemplate().widthMm, 36);

console.log("mezzo-labels/domain/template.test.ts OK");
