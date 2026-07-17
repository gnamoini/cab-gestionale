import assert from "node:assert/strict";
import { sanitizeFilenamePart } from "@/lib/inventory-labels/render/pdf-pipeline";

assert.equal(sanitizeFilenamePart("ABC/123"), "ABC_123");

console.log("inventory-labels/render/pdf-pipeline-emergency-zip.test.ts OK");
