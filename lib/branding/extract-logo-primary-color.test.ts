import assert from "node:assert/strict";
import { extractPrimaryColorFromPixels } from "@/lib/branding/extract-logo-primary-color";

function fillRect(
  data: Uint8ClampedArray,
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
}

{
  const width = 10;
  const height = 10;
  const data = new Uint8ClampedArray(width * height * 4);
  fillRect(data, width, 0, 0, width, height, 255, 255, 255);
  fillRect(data, width, 2, 2, 8, 8, 255, 102, 51);
  const hex = extractPrimaryColorFromPixels(data, width, height);
  assert.equal(hex, "#ff6633");
}

{
  const width = 8;
  const height = 8;
  const data = new Uint8ClampedArray(width * height * 4);
  fillRect(data, width, 0, 0, width, height, 0, 0, 0, 0);
  assert.equal(extractPrimaryColorFromPixels(data, width, height), null);
}

console.log("extract-logo-primary-color.test.ts OK");
