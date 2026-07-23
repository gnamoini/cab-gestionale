import assert from "node:assert/strict";
import { captureDocZoomEnablesPan } from "@/components/document-capture/capture-document-zoom-pan-viewport";

assert.equal(captureDocZoomEnablesPan(100), false);
assert.equal(captureDocZoomEnablesPan(105), true);
assert.equal(captureDocZoomEnablesPan(50), false);

console.log("capture-document-zoom-pan-viewport.test.ts OK");
