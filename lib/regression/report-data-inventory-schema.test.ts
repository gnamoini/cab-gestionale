import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const inventoryPath = join(process.cwd(), "docs/report-data-inventory.md");
const content = readFileSync(inventoryPath, "utf8");

assert.ok(content.includes("APPROVED"), "inventory must document approval gate");
assert.ok(content.includes("quote_conversion_pct"), "blocked metrics documented");
assert.ok(content.includes("Executive vs Advanced"), "density matrix present");
assert.ok(content.includes("DUPLICATED"), "duplicate list present");

console.log("report-data-inventory-schema.test.ts OK");
