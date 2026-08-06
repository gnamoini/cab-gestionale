import assert from "node:assert/strict";
import {
  diffOperationalTableVersions,
  filterDirtySignalTables,
  hasOperationalDataVersionDrift,
} from "@/lib/sync/operational-data-version";

assert.equal(hasOperationalDataVersionDrift(null, 100), false);
assert.equal(hasOperationalDataVersionDrift(100, 100), false);
assert.equal(hasOperationalDataVersionDrift(100, 101), true);

assert.deepEqual(diffOperationalTableVersions(null, { magazzino_ricambi: 10 }), []);
assert.deepEqual(diffOperationalTableVersions(null, { lavorazioni: 100, mezzi: 50 }), []);
assert.deepEqual(
  diffOperationalTableVersions({ magazzino_ricambi: 10, lavorazioni: 5 }, { magazzino_ricambi: 10, lavorazioni: 6 }),
  ["lavorazioni"],
);
assert.deepEqual(
  diffOperationalTableVersions({ mezzi: 50, lavorazioni: 100 }, { lavorazioni: 100 }),
  [],
  "omitted rpc keys must not drift",
);
assert.deepEqual(
  filterDirtySignalTables(["magazzino_ricambi", "log_modifiche", "lavorazioni"]),
  ["magazzino_ricambi", "lavorazioni"],
);

console.log("operational-data-version.test.ts OK");
