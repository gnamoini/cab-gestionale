import assert from "node:assert/strict";
import { generateCode128SvgString } from "@/lib/inventory-labels/render/barcode-core";
import { parseSvgFragment } from "@/lib/inventory-labels/render/svg-embed";

const svg = generateCode128SvgString("8FSNS030000001", 54, 4.5);
const frag = parseSvgFragment(svg);
const vb = frag.viewBox.split(/\s+/).map(Number);
assert.ok(vb[2]! > 250, "barcode viewBox width should scale with label width mm");

const narrow = parseSvgFragment(generateCode128SvgString("ABC", 30, 4));
const wide = parseSvgFragment(generateCode128SvgString("ABC", 60, 4));
assert.ok(Number(wide.viewBox.split(/\s+/)[2]) > Number(narrow.viewBox.split(/\s+/)[2]));

console.log("inventory-labels/render/barcode.test.ts OK");
