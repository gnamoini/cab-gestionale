import assert from "node:assert/strict";
import {
  LAVORAZIONI_INITIAL_SCHEde_PREFETCH_LIMIT,
  buildLavorazioniSchedeCodiciMap,
  pickLavorazioniInitialSchedeIds,
} from "@/lib/lavorazioni/lavorazioni-schede-prefetch";

const rows = Array.from({ length: 5 }, (_, i) => ({ id: `id-${i}`, codice: `C${i}` }));

assert.equal(LAVORAZIONI_INITIAL_SCHEde_PREFETCH_LIMIT, 100);
assert.deepEqual(pickLavorazioniInitialSchedeIds(rows, 2), ["id-0", "id-1"]);
assert.deepEqual(buildLavorazioniSchedeCodiciMap(rows, ["id-1"]), { "id-1": "C1" });
