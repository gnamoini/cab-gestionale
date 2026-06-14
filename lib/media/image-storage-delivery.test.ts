import assert from "node:assert/strict";
import { resolveStoredImageVariantPaths } from "@/lib/media/image-storage-delivery";

const prefix = "magazzino/ric-uuid";

assert.deepEqual(
  resolveStoredImageVariantPaths({
    baseName: "1234-photo",
    createdAt: null,
    thumb: `${prefix}/1234-photo.thumb.webp`,
    fullWebp: `${prefix}/1234-photo.full.webp`,
    fullAvif: `${prefix}/1234-photo.full.avif`,
  }),
  {
    thumbPath: `${prefix}/1234-photo.thumb.webp`,
    detailPath: `${prefix}/1234-photo.full.webp`,
    fullPath: `${prefix}/1234-photo.full.avif`,
    fullWebpPath: `${prefix}/1234-photo.full.webp`,
    legacyJpegPath: undefined,
    allPaths: [
      `${prefix}/1234-photo.thumb.webp`,
      `${prefix}/1234-photo.full.avif`,
      `${prefix}/1234-photo.full.webp`,
    ],
  },
  "detail delivery must prefer full WebP over AVIF",
);

assert.deepEqual(
  resolveStoredImageVariantPaths({
    baseName: "5678-legacy",
    createdAt: null,
    legacy: `${prefix}/5678-legacy.jpg`,
  }),
  {
    thumbPath: `${prefix}/5678-legacy.jpg`,
    detailPath: `${prefix}/5678-legacy.jpg`,
    fullPath: `${prefix}/5678-legacy.jpg`,
    fullWebpPath: undefined,
    legacyJpegPath: `${prefix}/5678-legacy.jpg`,
    allPaths: [`${prefix}/5678-legacy.jpg`],
  },
  "legacy JPEG must serve as thumb and detail",
);

assert.deepEqual(
  resolveStoredImageVariantPaths({
    baseName: "9999-thumb-only",
    createdAt: null,
    thumb: `${prefix}/9999-thumb-only.thumb.webp`,
  }),
  {
    thumbPath: `${prefix}/9999-thumb-only.thumb.webp`,
    detailPath: `${prefix}/9999-thumb-only.thumb.webp`,
    fullPath: `${prefix}/9999-thumb-only.thumb.webp`,
    fullWebpPath: undefined,
    legacyJpegPath: undefined,
    allPaths: [`${prefix}/9999-thumb-only.thumb.webp`],
  },
  "thumb-only group must fall back detail to thumb",
);

console.log("image-storage-delivery.test.ts OK");
