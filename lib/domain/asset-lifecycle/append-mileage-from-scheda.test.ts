import assert from "node:assert/strict";
import { parseKmFromScheda } from "@/lib/domain/asset-lifecycle/append-mileage-from-scheda";

assert.equal(parseKmFromScheda("125430,5"), 125430.5);
assert.equal(parseKmFromScheda(""), null);
assert.equal(parseKmFromScheda("-1"), null);

console.log("append-mileage-from-scheda.test.ts OK");
