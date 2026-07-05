import assert from "node:assert/strict";
import { kbStatsFromBuildReport, parseTkbBuildReport } from "@/lib/domain/technical-knowledge-base/ingestion/builder";
import type { TkbBuildReport } from "@/lib/domain/technical-knowledge-base/types";

assert.equal(parseTkbBuildReport(null), null);
assert.equal(parseTkbBuildReport({}), null);

const sample: TkbBuildReport = {
  builtAt: "2026-01-01T00:00:00.000Z",
  durationMs: 12,
  buildMode: "full",
  pipelineVersion: "p1",
  builderVersion: "b1",
  counts: {
    interventi: 3,
    componenti: 2,
    sintomi: 0,
    categorie: 1,
    procedure: 0,
    ricambiMap: 0,
    activities: 5,
  },
  delta: { added: 0, updated: 0, removed: 0 },
  merge: { performed: 1, duplicatesFound: 0, conflictsResolved: 0 },
  excluded: { deleted: 0, inactive: 0, invalid: 0, rbacDenied: 0 },
  warnings: [],
  adapters: {},
};

assert.deepEqual(parseTkbBuildReport(sample)?.counts.interventi, 3);
assert.equal(kbStatsFromBuildReport(sample).interventi, 3);

console.log("builder.test.ts OK");
