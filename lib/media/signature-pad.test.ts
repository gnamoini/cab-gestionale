import assert from "node:assert/strict";
import {
  SIGNATURE_PAD_STROKE_WIDTH,
  drawSignaturePadSegment,
  hasSignatureDataUrl,
} from "@/lib/media/signature-pad";

assert.equal(hasSignatureDataUrl("data:image/png;base64,abc"), true);
assert.equal(hasSignatureDataUrl(""), false);
assert.equal(hasSignatureDataUrl(undefined), false);
assert.ok(SIGNATURE_PAD_STROKE_WIDTH >= 3);

const calls: string[] = [];
const ctx = {
  strokeStyle: "",
  fillStyle: "",
  lineWidth: 0,
  lineCap: "",
  lineJoin: "",
  beginPath() {
    calls.push("beginPath");
  },
  moveTo() {
    calls.push("moveTo");
  },
  lineTo() {
    calls.push("lineTo");
  },
  stroke() {
    calls.push("stroke");
  },
  arc() {
    calls.push("arc");
  },
  fill() {
    calls.push("fill");
  },
} as unknown as CanvasRenderingContext2D;

drawSignaturePadSegment(ctx, { x: 10, y: 10 }, { x: 10, y: 10 });
assert.deepEqual(calls, ["beginPath", "arc", "fill"]);

calls.length = 0;
drawSignaturePadSegment(ctx, { x: 0, y: 0 }, { x: 12, y: 0 });
assert.deepEqual(calls, ["beginPath", "moveTo", "lineTo", "stroke"]);

console.log("signature-pad.test.ts OK");
