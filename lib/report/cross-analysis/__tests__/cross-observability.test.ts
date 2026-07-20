import assert from "node:assert/strict";
import { buildReportCrossDto } from "@/lib/report/cross-analysis/build-report-cross-dto";
import { bundleFromDomainDtos } from "@/lib/report/cross-analysis/normalize-cross-input";
import { reportMetricObserver } from "@/lib/report/observability/report-metric-observability";

reportMetricObserver.drain();

const bundle = bundleFromDomainDtos({ invoicesAvailable: false });
buildReportCrossDto(bundle);

const events = reportMetricObserver.drain();
const partials = events.filter((e) => e.event === "cross_metric_partial");
assert.ok(partials.length >= 1);
assert.equal(partials[0]!.payload.consumer, "cross-analysis");

console.log("cross-observability.test.ts OK");
