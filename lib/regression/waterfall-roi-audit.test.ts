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

const reportLiveDerived = read("lib/report/use-report-live-data-derived.ts");
assert.match(
  reportLiveDerived,
  /needsClientEnrich/,
  "use-report-live-data must enrich lav+mezzi only on refetch path (needsClientEnrich gate)",
);

const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
assert.match(prefetch, /fetchReportDataDTOServer/, "prefetchReportPage must seed cache from report DTO");

const reportPage = read("app/(gestionale)/report/page.tsx");
assert.match(reportPage, /GestionaleHydrationBoundary/, "report page must hydrate dehydrated cache");
assert.match(reportPage, /prefetchGestionalePage\(qc, "report"\)/, "report page must prefetch via gestionale page helper");
assert.match(prefetch, /fetchPreventiviPageDTOServer/, "prefetch preventivi must seed cache from preventivi BFF");
assert.match(prefetch, /fetchFatturazionePageDTOServer/, "prefetch fatturazione must seed cache from fatturazione BFF");

const preventiviPage = read("app/(gestionale)/preventivi/page.tsx");
assert.match(preventiviPage, /GestionaleHydrationBoundary/, "preventivi page must hydrate dehydrated cache");

const fatturazionePage = read("app/(gestionale)/fatturazione/page.tsx");
assert.match(fatturazionePage, /GestionaleHydrationBoundary/, "fatturazione page must hydrate dehydrated cache");
assert.match(fatturazionePage, /prefetchGestionalePage\(qc, "fatturazione"/, "fatturazione page must prefetch via gestionale page helper");

const documentiPage = read("app/(gestionale)/documenti/page.tsx");
assert.match(documentiPage, /GestionaleHydrationBoundary/, "documenti page must hydrate dehydrated cache");
assert.match(documentiPage, /prefetchGestionalePage\(qc, "documenti"/, "documenti page must prefetch via gestionale page helper");

assert.match(prefetch, /fetchDocumentiPageDTOServer/, "prefetch documenti must seed cache from documenti BFF");

const mezziPage = read("app/(gestionale)/mezzi/page.tsx");
assert.match(mezziPage, /GestionaleHydrationBoundary/, "mezzi page must hydrate dehydrated cache");
assert.match(mezziPage, /prefetchGestionalePage\(qc, "mezzi"\)/, "mezzi page must prefetch via gestionale page helper");
assert.match(prefetch, /fetchMezziPageDTOServer/, "prefetch mezzi must seed cache from mezzi BFF");

const dipendentiPage = read("app/(gestionale)/dipendenti/page.tsx");
assert.match(dipendentiPage, /GestionaleHydrationBoundary/, "dipendenti page must hydrate dehydrated cache");
assert.match(dipendentiPage, /prefetchGestionalePage\(qc, "dipendenti"\)/, "dipendenti page must prefetch via gestionale page helper");
assert.match(prefetch, /fetchDipendentiPageDTOServer/, "prefetch dipendenti must seed cache from dipendenti BFF");

const gestionaleLayout = read("app/(gestionale)/layout.tsx");
assert.match(gestionaleLayout, /prefetchGestionaleLayoutSettings/, "gestionale layout must prefetch settings once per RSC");

const impostazioniPage = read("app/(gestionale)/impostazioni/page.tsx");
assert.match(impostazioniPage, /GestionaleHydrationBoundary/, "impostazioni page must hydrate dehydrated cache");
assert.match(impostazioniPage, /prefetchGestionalePage\(qc, "impostazioni"\)/, "impostazioni page must prefetch via gestionale page helper");
assert.doesNotMatch(impostazioniPage, /prefetchImpostazioniPage\(\)/, "impostazioni page must not block on legacy prefetch");

const prefetchDeferredImpostazioni = prefetch.split("export async function prefetchDeferredPage")[1] ?? "";
const impDeferredBlock = prefetchDeferredImpostazioni.split('case "impostazioni":')[1]?.split('case "')[0] ?? "";
assert.match(impDeferredBlock, /getAppSettingsPayloadServer/, "prefetch impostazioni deferred must seed settings payload");

const sicurezzaPage = read("app/(gestionale)/sicurezza/page.tsx");
assert.match(sicurezzaPage, /GestionaleHydrationBoundary/, "sicurezza page must hydrate dehydrated cache");
assert.match(sicurezzaPage, /prefetchGestionalePage\(qc, "sicurezza"\)/, "sicurezza page must prefetch via gestionale page helper");
assert.doesNotMatch(sicurezzaPage, /prefetchSicurezzaPage\(\)/, "sicurezza page must not block on legacy prefetch");
assert.match(prefetch, /fetchSicurezzaPageDTOServer/, "prefetch sicurezza must seed cache from sicurezza BFF");

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

const lavorazioniPage = read("app/(gestionale)/lavorazioni/page.tsx");
assert.match(lavorazioniPage, /GestionaleHydrationBoundary/, "lavorazioni page must hydrate dehydrated cache");
assert.match(lavorazioniPage, /LavorazioniDeferredHydration/, "lavorazioni page must use deferred hydration");
assert.match(lavorazioniPage, /prefetchCriticalPage\(qc, "lavorazioni"\)/, "lavorazioni page must prefetch critical shell");
assert.doesNotMatch(lavorazioniPage, /prefetchGestionalePage\(qc, "lavorazioni"\)/, "lavorazioni page must not block on legacy full prefetch");

const lavorazioniDeferred = read("components/gestionale/lavorazioni/lavorazioni-deferred-hydration.tsx");
assert.doesNotMatch(lavorazioniDeferred, /if\s*\(.*data/, "lavorazioni deferred must not gate on data completeness");

console.log("waterfall-roi-audit: ok");
