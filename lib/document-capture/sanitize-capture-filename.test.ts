import assert from "node:assert/strict";
import { sanitizeCaptureFilename } from "@/lib/document-capture/sanitize-capture-filename";

assert.equal(
  sanitizeCaptureFilename({ rawFileName: "../../../etc/passwd", expectedMime: "application/pdf" }),
  "passwd.pdf",
);
assert.equal(
  sanitizeCaptureFilename({ rawFileName: "foo\u202ebar.pdf", expectedMime: "application/pdf" }),
  "foobar.pdf",
);
assert.ok(
  sanitizeCaptureFilename({ rawFileName: `${"a".repeat(300)}.pdf`, expectedMime: "application/pdf" }).length <=
    125,
);
assert.match(sanitizeCaptureFilename({ rawFileName: "   ", fallbackId: "abc12345" }), /^document-abc12345\./);
assert.equal(
  sanitizeCaptureFilename({ rawFileName: "evil.svg", expectedMime: "image/svg+xml" }),
  "evil.svg",
);
assert.equal(
  sanitizeCaptureFilename({ rawFileName: "file.pdf.exe", expectedMime: "application/pdf" }),
  "file.pdf.pdf",
);
assert.equal(
  sanitizeCaptureFilename({ rawFileName: "doc.PDF", expectedMime: "application/pdf" }),
  "doc.pdf",
);

console.log("sanitize-capture-filename.test.ts OK");
