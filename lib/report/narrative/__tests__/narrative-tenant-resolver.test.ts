import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const resolverSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/services/resolve-narrative-tenant-context.ts"),
  "utf8",
);

assert.match(resolverSrc, /tenantResolved/);
assert.doesNotMatch(resolverSrc, /["']default["']/);
assert.match(resolverSrc, /["']unknown["']/);

console.log("narrative-tenant-resolver.test.ts OK");
