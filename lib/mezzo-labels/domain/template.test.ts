import assert from "node:assert/strict";
import {
  MEZZO_LABEL_TEMPLATE,
  mmToPt,
  mezzoLabelGridTemplate,
} from "@/lib/mezzo-labels/domain/template";
import { MM_TO_PT } from "@/lib/mezzo-labels/domain/types";

assert.equal(MEZZO_LABEL_TEMPLATE.widthMm, 50);
assert.equal(MEZZO_LABEL_TEMPLATE.heightMm, 22);
assert.equal(MEZZO_LABEL_TEMPLATE.safeMarginMm, 2);
assert.equal(MEZZO_LABEL_TEMPLATE.qr.sizeMm, 20);
assert.equal(MEZZO_LABEL_TEMPLATE.qr.xMm, 2);
assert.equal(MEZZO_LABEL_TEMPLATE.qr.yMm, 1);
assert.equal(mmToPt(50), 50 * MM_TO_PT);
assert.equal(mezzoLabelGridTemplate().widthMm, 50);

console.log("mezzo-labels/domain/template.test.ts OK");
