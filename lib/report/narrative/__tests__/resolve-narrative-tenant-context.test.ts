import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/services/resolve-narrative-tenant-context.ts"),
  "utf8",
);

assert.match(src, /ok:\s*true/, "success tenant context must set ok: true");
assert.match(src, /ok:\s*false/, "failure tenant context must set ok: false");

const apiSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/api/report-narrative-api.ts"),
  "utf8",
);
assert.match(apiSrc, /if \(!tenantResult\.ok\)/, "API must branch on tenantResult.ok");

console.log("resolve-narrative-tenant-context.test.ts OK");
