import assert from "node:assert/strict";
import {
  applyOreLavoroStorageToCampi,
  patchOreLavoroFromUi,
  resolveOreLavoroFields,
  serializeOreLavoroFields,
} from "./resolve-ore-lavoro-fields";

assert.deepEqual(resolveOreLavoroFields({ oreLavoro: "1200" }), {
  oreLavoroMotore: "1200",
  oreLavoroPto: "",
});

assert.deepEqual(resolveOreLavoroFields({ oreLavoroMotore: "1300", oreLavoro: "1200" }), {
  oreLavoroMotore: "1300",
  oreLavoroPto: "",
});

assert.deepEqual(resolveOreLavoroFields({ oreLavoroMotore: "", oreLavoroPto: "50" }), {
  oreLavoroMotore: "",
  oreLavoroPto: "50",
});

const serialized = serializeOreLavoroFields({ oreLavoroMotore: "1500", oreLavoroPto: "40" });
assert.equal(serialized.oreLavoro, "1500");
assert.equal(serialized.oreLavoroMotore, "1500");
assert.equal(serialized.oreLavoroPto, "40");

const patched = patchOreLavoroFromUi(
  { oreLavoroMotore: "100", oreLavoroPto: "" },
  { oreLavoroPto: "25" },
);
assert.equal(patched.oreLavoro, "100");
assert.equal(patched.oreLavoroMotore, "100");
assert.equal(patched.oreLavoroPto, "25");

const campi: Record<string, unknown> = { cliente: "X" };
applyOreLavoroStorageToCampi(campi, { oreLavoroMotore: "900", oreLavoroPto: "10" });
assert.equal(campi.oreLavoro, "900");
assert.equal(campi.oreLavoroMotore, "900");
assert.equal(campi.oreLavoroPto, "10");

console.log("resolve-ore-lavoro-fields.test.ts OK");
