import assert from "node:assert/strict";
import { normalizeCaptureMime, resolveCaptureMimeFromFile } from "@/lib/document-capture/capture-mime";

assert.equal(normalizeCaptureMime({ mime: "image/jpg" }), "image/jpeg");

assert.equal(
  normalizeCaptureMime({ mime: "", fileName: "scheda.jpg" }),
  "image/jpeg",
);

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
assert.equal(normalizeCaptureMime({ mime: "application/octet-stream", bytes: pngBytes }), "image/png");

assert.equal(
  resolveCaptureMimeFromFile({ name: "foto.heic", type: "" } as File),
  "image/heic",
);

console.log("capture-mime.test.ts OK");
