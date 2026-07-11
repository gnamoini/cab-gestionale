import assert from "node:assert/strict";
import { buildGeminiCaptureDocumentPart } from "@/lib/document-capture/gemini-capture-content";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

assert.equal(buildGeminiCaptureDocumentPart(png, "image/png").type, "image");
assert.equal(buildGeminiCaptureDocumentPart(pdf, "application/pdf").type, "file");

console.log("gemini-capture-content.test.ts OK");
