import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/services/narrative-rate-limit.server.ts"),
  "utf8",
);

assert.match(src, /windowMs:\s*10 \* 60 \* 1000/);
assert.match(src, /maxAttempts:\s*5/);
assert.match(src, /report-narrative/);
assert.match(src, /rateLimitKey/);
assert.match(src, /userId\.trim/);
assert.match(src, /companyId\.trim/);
assert.match(src, /report_narrative/);

console.log("narrative-rate-limit.test.ts OK");
