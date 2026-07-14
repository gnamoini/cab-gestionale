import assert from "node:assert/strict";
import { nestedSvgAt, parseSvgFragment } from "@/lib/inventory-labels/render/svg-embed";

const qrSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 33 33"><path d="M0 0"/></svg>';
const frag = parseSvgFragment(qrSvg);
assert.equal(frag.viewBox, "0 0 33 33");

const nested = nestedSvgAt(10, 20, 240, 240, frag);
assert.ok(nested.includes('viewBox="0 0 33 33"'), "nested svg must preserve viewBox");
assert.ok(nested.includes('width="240"'));

console.log("inventory-labels/render/svg-embed.test.ts OK");
