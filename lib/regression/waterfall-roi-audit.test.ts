import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const preventiviRecordsHook = read("src/hooks/gestionale/use-preventivi-records-query.ts");
assert.doesNotMatch(
  preventiviRecordsHook,
  /useMezziListQuery/,
  "use-preventivi-records-query must not join mezzi via separate list query",
);
assert.match(
  preventiviRecordsHook,
  /fetchPreventiviRecordsAuthorized/,
  "use-preventivi-records-query must use embedded fetch",
);

const reportLive = read("lib/report/use-report-live-data.ts");
assert.match(
  reportLive,
  /needsClientEnrich/,
  "use-report-live-data must enrich lav+mezzi only on refetch path (needsClientEnrich gate)",
);

const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
assert.match(prefetch, /fetchReportDataDTOServer/, "prefetchReportPage must seed cache from report DTO");
assert.match(prefetch, /fetchPreventiviRecordsServer/, "prefetchPreventiviPage must seed cache from preventivi server fetch");

const preventiviPage = read("app/(gestionale)/preventivi/page.tsx");
assert.match(preventiviPage, /GestionaleHydrationBoundary/, "preventivi page must hydrate dehydrated cache");

const movimentiFetch = read("lib/movimenti/movimenti-list-fetch.ts");
assert.match(
  movimentiFetch,
  /lavorazioni!inner\(mezzo_id\)/,
  "movimenti fetch must support mezzo_id join filter",
);

const mezzoDomainQueries = read("src/services/domain/mezzo-domain.queries.ts");
const movFnBody = mezzoDomainQueries.match(/export function useMezzoMovimenti[\s\S]*?^}/m)?.[0] ?? "";
assert.ok(movFnBody.length > 0, "useMezzoMovimenti must exist");
assert.match(movFnBody, /mezzo_id:\s*id/, "useMezzoMovimenti must query by mezzo_id");
assert.doesNotMatch(movFnBody, /useMezzoLavorazioni/, "useMezzoMovimenti must not gate on lavorazioni list");

const preventiviListFetch = read("lib/preventivi/preventivi-list-fetch.ts");
assert.match(
  preventiviListFetch,
  /mezzi\(/,
  "preventivi list fetch must embed mezzi in single Supabase select",
);

console.log("waterfall-roi-audit: ok");
