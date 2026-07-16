import assert from "node:assert/strict";
import {
  capturePdfFullscreenUrl,
  capturePdfPreviewFrameUrl,
  capturePdfPreviewUrl,
} from "./capture-pdf-preview-url";

assert.equal(
  capturePdfPreviewUrl("/api/document-capture/abc/file"),
  "/api/document-capture/abc/file#toolbar=0&navpanes=0&scrollbar=0",
);

assert.equal(
  capturePdfPreviewFrameUrl("abc"),
  "/api/document-capture/abc/preview-frame",
);

assert.equal(
  capturePdfPreviewFrameUrl("abc", 353),
  "/api/document-capture/abc/preview-frame?w=353",
);

assert.equal(
  capturePdfFullscreenUrl("/api/document-capture/abc/file"),
  "/api/document-capture/abc/file#toolbar=0&navpanes=0&scrollbar=1&view=FitH",
);

console.log("capture-pdf-preview-url.test.ts OK");
