import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getPrefetchRoutesForScope } from "@/lib/render/query-ownership-registry";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const page = read("app/(gestionale)/dipendenti/page.tsx");
const deferred = read("components/gestionale/dipendenti/dipendenti-deferred-hydration.tsx");
const bff = read("lib/bff/dipendenti-page-fetch-server.ts");
const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
const queries = read("src/hooks/gestionale/use-dipendenti-timesheet-queries.ts");
const hook = read("src/hooks/use-dipendenti-timesheet.ts");
const view = read("components/gestionale/dipendenti/dipendenti-view.tsx");
const derived = read("lib/dipendenti/use-dipendenti-timesheet-derived.ts");

assert.match(page, /prefetchCriticalPage\(qc, "dipendenti"\)/);
assert.match(page, /DipendentiDeferredHydration/);
assert.match(page, /Suspense/);

assert.match(deferred, /prefetchDeferredPage\(qc, "dipendenti"\)/);

assert.match(bff, /fetchDipendentiPageDTOServer/);
assert.match(bff, /fetchDipendentiEmployeesServer/);
assert.match(bff, /cache\(/);

const prefetchDeferred = prefetch.split("export async function prefetchDeferredPage")[1] ?? "";
const dipBlock = prefetchDeferred.split('case "dipendenti":')[1]?.split('case "')[0] ?? "";
assert.match(dipBlock, /fetchDipendentiPageDTOServer/);
assert.match(dipBlock, /seedPrefetchedData/);
assert.match(dipBlock, /dipendentiTimesheetEmployees/);

assert.match(queries, /ownershipScopeKey: DIPENDENTI_EMPLOYEES_SCOPE/);
assert.match(queries, /dipendenti\.employees/);
assert.match(queries, /useSharedEntityQuery/);

assert.match(hook, /useDipendentiTimesheetDerived/);
assert.match(hook, /useDipendentiEmployeesQuery/);
assert.match(hook, /useDipendentiEntriesRangeQuery/);

assert.match(view, /TimesheetEditorModal = dynamic/);
assert.match(view, /DipendenteDetailModal = dynamic/);
assert.match(view, /prefetchDipendentiMonthEntries/);
assert.match(view, /useDipendentiTimesheet/);

assert.match(derived, /useDipendentiTimesheetDerived/);
assert.match(derived, /entriesByKey/);

const dipRoutes = getPrefetchRoutesForScope("dipendenti.employees");
assert.ok(dipRoutes.includes("/dipendenti"));

console.log("dipendenti-perf-policy.test.ts OK");
