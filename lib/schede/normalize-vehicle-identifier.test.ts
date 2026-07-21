import assert from "node:assert/strict";
import { normalizeVehicleIdentifier } from "@/lib/schede/normalize-vehicle-identifier";

const targaVariants = ["AB123CD", "AB 123 CD", "ab123cd", "AB-123-CD"];
for (const v of targaVariants) {
  assert.equal(normalizeVehicleIdentifier("targa", v), "AB123CD", `targa: ${v}`);
}

assert.equal(normalizeVehicleIdentifier("matricola", "mat-01"), "MAT-01");
assert.equal(normalizeVehicleIdentifier("matricola", "non assegnata"), "");
assert.equal(normalizeVehicleIdentifier("scuderia", " 42 "), "42");
assert.equal(normalizeVehicleIdentifier("vin", "wdb 123"), "WDB123");

console.log("normalize-vehicle-identifier.test.ts OK");
