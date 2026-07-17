import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CLIENT_PORTAL_INCORSO_FILTERS } from "@/lib/lavorazioni/client-portal-prefetch-filters";
import { resolveInitialLoad } from "@/lib/render/render-path-orchestrator";
import { getPrefetchRoutesForScope } from "@/lib/render/query-ownership-registry";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const page = read("app/(gestionale)/lavorazioni-clienti/page.tsx");
const detailPage = read("app/(gestionale)/lavorazioni-clienti/[id]/page.tsx");
const lazy = read("components/gestionale/lazy-route-views.tsx");
const contract = read("src/hooks/use-client-portal-data-contract.ts");
const view = read("components/lavorazioni-clienti/client-lavorazioni-view.tsx");
const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");

assert.match(page, /ClientPortalDeferredHydration/);
assert.match(page, /prefetchCriticalPage\(qc, "lavorazioni_clienti"\)/);

assert.match(detailPage, /ClientLavorazioneDetailViewLazy/);
assert.match(lazy, /ClientLavorazioneDetailViewLazy = dynamic/);

const prefetchDeferred = prefetch.split("export async function prefetchDeferredPage")[1] ?? "";
const portalBlock = prefetchDeferred.split('case "lavorazioni_clienti":')[1]?.split("case ")[0] ?? "";
assert.match(portalBlock, /fetchClientPortalPageDTOServer/);
assert.match(portalBlock, /clientPortal\.lavorazioni\.inCorso/);

assert.match(contract, /archivioListEnabled/);
assert.match(contract, /archivioSchedeEnabled/);
assert.match(contract, /schedeLavorazioneIds/);

assert.match(view, /archivioExpanded/);
assert.match(view, /lsdPaginated/);
assert.match(view, /useUndoableLog\("lavorazioni",\s*\{\s*enabled: ingressoRow/);

const inCorsoRoutes = getPrefetchRoutesForScope("clientPortal.lavorazioni.inCorso");
assert.ok(inCorsoRoutes.includes("/lavorazioni-clienti"));

assert.equal(CLIENT_PORTAL_INCORSO_FILTERS.archived, false);

const inCorsoKey = resolveInitialLoad({ scopeKey: "clientPortal.lavorazioni.inCorso" }).queryKey;
assert.ok(JSON.stringify(inCorsoKey).length > 2);

console.log("client-portal-perf-policy.test.ts OK");
