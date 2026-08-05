import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const propagation = fs.readFileSync(
  path.join(process.cwd(), "src/services/settings-rename-propagation.service.ts"),
  "utf8",
);
assert.match(propagation, /"preventivi", "utilizzatore"/);
assert.match(propagation, /insertJobDetails/);
assert.match(propagation, /affected_rows: r\.updated/);

const invalidate = fs.readFileSync(
  path.join(process.cwd(), "src/lib/react-query/invalidate-related.ts"),
  "utf8",
);
assert.match(invalidate, /tables\.add\("preventivi"\)/);
assert.match(invalidate, /case "utilizzatore"/);

const registry = fs.readFileSync(
  path.join(process.cwd(), "lib/settings/rename-engine/rename-operation-registry.ts"),
  "utf8",
);
assert.match(registry, /utilizzatore\.preventivi/);

console.log("settings-utilizzatore-propagation-audit.test.ts OK");
