import assert from "node:assert/strict";
import {
  generateInventoryPublicToken,
  isValidInventoryTokenFormat,
  normalizeInventoryToken,
  buildInventoryQrUrl,
} from "@/lib/inventory-labels/domain/tokens";
import { INVENTORY_TOKEN_PREFIX } from "@/lib/inventory-labels/domain/tokens";

assert.match(generateInventoryPublicToken(), /^CAB-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/);
assert.equal(generateInventoryPublicToken({ withPrefix: false }).length, 10);
assert.ok(isValidInventoryTokenFormat("CAB-8K4J9P2X7M"));
assert.ok(!isValidInventoryTokenFormat("invalid token"));
assert.equal(normalizeInventoryToken("cab-8k4j9p2x7m"), "CAB-8K4J9P2X7M");
assert.equal(buildInventoryQrUrl("CAB-TEST", "https://app.example.com"), "https://app.example.com/r/CAB-TEST");
assert.equal(INVENTORY_TOKEN_PREFIX, "CAB-");

console.log("inventory-labels/domain/tokens.test.ts OK");
