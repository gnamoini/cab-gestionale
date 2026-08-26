import assert from "node:assert/strict";
import {
  buildMezzoQrUrl,
  generateMezzoPublicToken,
  isValidMezzoQrTokenFormat,
  normalizeMezzoQrToken,
} from "@/lib/mezzo-labels/domain/tokens";

assert.match(generateMezzoPublicToken(), /^CAB-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/);
assert.ok(isValidMezzoQrTokenFormat("CAB-8K4J9P2X7M"));
assert.equal(normalizeMezzoQrToken("cab-8k4j9p2x7m"), "CAB-8K4J9P2X7M");
assert.equal(
  buildMezzoQrUrl("CAB-TEST", "https://app.example.com"),
  "https://app.example.com/m/q/CAB-TEST",
);

console.log("mezzo-labels/domain/tokens.test.ts OK");
