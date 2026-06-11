import assert from "node:assert/strict";
import {
  clampImageCropPan,
  computeImageCropRect,
  initialImageCropLayout,
} from "@/lib/media/image-crop";

const layout = initialImageCropLayout(1600, 900, 300);
assert.equal(layout.zoom, 1);
assert.ok(layout.baseScale > 0);

const centered = computeImageCropRect(1600, 900, 300, layout);
assert.ok(centered.width > 0);
assert.ok(centered.height > 0);
assert.equal(centered.x + centered.width <= 1600, true);
assert.equal(centered.y + centered.height <= 900, true);

const zoomed: typeof layout = {
  ...layout,
  zoom: 2,
  ...clampImageCropPan(1600, 900, 300, { baseScale: layout.baseScale, zoom: 2 }, layout.offsetX, layout.offsetY),
};
const zoomedCrop = computeImageCropRect(1600, 900, 300, zoomed);
assert.ok(zoomedCrop.width < centered.width);

const pan = clampImageCropPan(800, 800, 200, { baseScale: 0.25, zoom: 1 }, -999, -999);
assert.equal(pan.offsetX, 200 - 800 * 0.25);
assert.equal(pan.offsetY, 200 - 800 * 0.25);

console.log("image-crop.test.ts OK");
