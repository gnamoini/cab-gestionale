import assert from "node:assert/strict";
import { emailAttachmentContentBase64 } from "@/lib/communications/providers/resend-attachment-content";

assert.equal(emailAttachmentContentBase64("YWJj"), "YWJj");
assert.equal(emailAttachmentContentBase64(new Uint8Array([97, 98, 99])), "YWJj");

console.log("resend-attachment-content.test.ts: ok");
