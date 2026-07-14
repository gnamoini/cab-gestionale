import assert from "node:assert/strict";
import { cutBorderRectSvg } from "@/lib/inventory-labels/render/cut-border";
import { getLabelTemplate, mmToPx } from "@/lib/inventory-labels/domain/templates";

const template = getLabelTemplate("60x40-default")!;
const w = mmToPx(template.widthMm, template.dpi);
const h = mmToPx(template.heightMm, template.dpi);
const border = cutBorderRectSvg(w, h, template.cutBorderMm, template.dpi);

assert.ok(border);
assert.ok(border!.includes('stroke="#999999"'), "cut border stroke expected");
assert.equal(cutBorderRectSvg(w, h, 0, template.dpi), null);

console.log("inventory-labels/render/svg.test.ts OK");
