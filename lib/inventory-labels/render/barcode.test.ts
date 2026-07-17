import assert from "node:assert/strict";
import { generateCode128SvgString } from "@/lib/inventory-labels/render/barcode-core";
import { cropSvgFragmentToInkBounds, parseSvgFragment } from "@/lib/inventory-labels/render/svg-embed";

const svg = generateCode128SvgString("8FSNS030000001", 54, 4.5);
const raw = parseSvgFragment(svg);
const frag = cropSvgFragmentToInkBounds(raw);
const vb = frag.viewBox.split(/\s+/).map(Number);
const rawVb = raw.viewBox.split(/\s+/).map(Number);
assert.ok(vb[2]! > 250, "barcode viewBox width should scale with label width mm");
assert.ok(vb[0]! <= 1.5, "ink crop rimuove quiet zone sinistra");
assert.ok(rawVb[2]! - vb[2]! <= rawVb[2]! * 0.02, "crop quasi a larghezza piena barre");

const narrow = cropSvgFragmentToInkBounds(parseSvgFragment(generateCode128SvgString("ABC", 30, 4)));
const wide = cropSvgFragmentToInkBounds(parseSvgFragment(generateCode128SvgString("ABC", 60, 4)));
assert.ok(Number(wide.viewBox.split(/\s+/)[2]) > Number(narrow.viewBox.split(/\s+/)[2]));

console.log("inventory-labels/render/barcode.test.ts OK");
