import assert from "node:assert/strict";
import {
  checkDatasetAccess,
  getDatasetAccessPolicy,
} from "@/lib/report/datasets/registry";
import { buildClientiDataset } from "@/lib/report/datasets/builders/clienti";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { defaultRequestedPeriod } from "@/lib/report/datasets/period";
import { minimalDatasetSlices } from "@/lib/report/datasets/__tests__/test-helpers";
import { resolveReportV2DatasetsEnabled } from "@/lib/feature-flags/report-v2-flag";

const clientiPolicy = getDatasetAccessPolicy("clienti");

const denied = checkDatasetAccess(clientiPolicy, new Set(["mezzi"]));
assert.equal(denied.ok, true);

const missingMezzi = checkDatasetAccess(clientiPolicy, new Set(["lavorazioni"]));
assert.equal(missingMezzi.ok, false);
assert.deepEqual(missingMezzi.missing, ["mezzi"]);

const withOptional = checkDatasetAccess(clientiPolicy, new Set(["mezzi", "lavorazioni"]));
assert.ok(withOptional.optionalGranted.includes("lavorazioni"));

const slices = minimalDatasetSlices();
const ctx = createReportDatasetContext({
  period: defaultRequestedPeriod(),
  compareMode: "none",
  integrity: slices.integrity,
});

const withoutRanking = buildClientiDataset(ctx, slices, { includeRanking: false });
assert.equal(withoutRanking.data.ranking, undefined);

const withRanking = buildClientiDataset(ctx, slices, { includeRanking: true });
assert.ok(Array.isArray(withRanking.data.ranking));

const prev = process.env.NEXT_PUBLIC_REPORT_V2_DATASETS;
try {
  delete process.env.NEXT_PUBLIC_REPORT_V2_DATASETS;
  assert.equal(resolveReportV2DatasetsEnabled(), false, "flag default off");
} finally {
  if (prev === undefined) delete process.env.NEXT_PUBLIC_REPORT_V2_DATASETS;
  else process.env.NEXT_PUBLIC_REPORT_V2_DATASETS = prev;
}

console.log("report-dataset-rbac.test.ts OK");
