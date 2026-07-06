import assert from "node:assert/strict";
import { isVinUniqueViolation } from "@/src/services/mezzi.service";

assert.equal(
  isVinUniqueViolation({
    code: "23505",
    message: 'duplicate key value violates unique constraint "idx_mezzi_telaio_num_norm_unique"',
  }),
  true,
);

assert.equal(
  isVinUniqueViolation({
    code: "23505",
    message: 'duplicate key value violates unique constraint "mezzi_entity_key_key"',
  }),
  false,
);

assert.equal(isVinUniqueViolation({ code: "23505", message: "generic" }), false);
assert.equal(isVinUniqueViolation(null), false);

console.log("mezzi-vin-unique.test.ts OK");
