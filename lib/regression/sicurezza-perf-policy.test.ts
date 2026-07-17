import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getPrefetchRoutesForScope } from "@/lib/render/query-ownership-registry";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const page = read("app/(gestionale)/sicurezza/page.tsx");
const deferred = read("components/gestionale/sicurezza/sicurezza-deferred-hydration.tsx");
const bff = read("lib/bff/sicurezza-page-fetch-server.ts");
const usersFetch = read("lib/security/security-users-permissions-fetch-server.ts");
const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
const usersHook = read("src/hooks/use-security-users-permissions-query.ts");
const sicurezzaHook = read("src/hooks/use-sicurezza-users-permissions-query.ts");
const view = read("components/dashboard/security-dashboard-view.tsx");
const loaders = read("components/dashboard/security/security-tab-loaders.tsx");
const tabPrefetch = read("lib/security/prefetch-sicurezza-tab-queries.ts");
const budget = read("lib/performance/performance-budget-registry.ts");
const layout = read("app/(gestionale)/sicurezza/layout.tsx");
const registry = read("lib/render/query-ownership-registry.ts");

assert.match(page, /prefetchCriticalPage\(qc, "sicurezza"\)/);
assert.match(page, /SicurezzaDeferredHydration/);
assert.match(page, /Suspense/);
assert.doesNotMatch(page, /prefetchSicurezzaPage\(\)/);

assert.match(deferred, /prefetchDeferredPage\(qc, "sicurezza"\)/);

assert.match(bff, /fetchSicurezzaPageDTOServer/);
assert.match(bff, /cache\(/);
assert.match(bff, /getAppSettingsPayloadReadServer/);
assert.match(bff, /fetchSecurityUsersPermissionsServer/);

assert.match(usersFetch, /fetchSecurityUsersPermissionsServer/);
assert.match(usersFetch, /cache\(/);

const prefetchCritical =
  prefetch.split("export async function prefetchCriticalPage")[1]?.split("export async function prefetchDeferredPage")[0] ?? "";
const secCriticalBlock = prefetchCritical.match(/case "sicurezza":([\s\S]*?)case "/)?.[1] ?? "";
assert.doesNotMatch(secCriticalBlock, /getAppSettingsPayloadServer/);
assert.match(prefetchCritical, /case "sicurezza":\s*return;/);

const prefetchDeferred = prefetch.split("export async function prefetchDeferredPage")[1] ?? "";
const secDeferredBlock = prefetchDeferred.split('case "sicurezza":')[1]?.split('case "')[0] ?? "";
assert.match(secDeferredBlock, /fetchSicurezzaPageDTOServer/);
assert.match(secDeferredBlock, /seedPrefetchedData/);
assert.match(secDeferredBlock, /securityUsersPermissions/);
assert.match(secDeferredBlock, /settings\.payload/);

assert.match(usersHook, /refetchOnMount: options\?\.skipMountRefetch \? false : true/);

assert.match(sicurezzaHook, /useSicurezzaUsersPermissionsQuery/);
assert.match(sicurezzaHook, /skipMountRefetch/);

assert.match(view, /useSicurezzaUsersPermissionsQuery/);
assert.match(view, /needsUsers/);
assert.match(view, /prefetchSicurezzaTabQueries/);
assert.match(view, /selectTab/);
assert.match(view, /SecurityRolesPanelLazy/);
assert.match(view, /SecurityMonitoringSectionLazy/);
assert.match(view, /SecurityReleaseSectionLazy/);
assert.doesNotMatch(view, /useGlobalOptions/);
assert.match(view, /activeTab !== "release"/);

assert.match(view, /SecurityUsersPermissionsPanelLazy/);
assert.match(loaders, /SecurityUsersPermissionsPanelLazy/);
assert.match(loaders, /dynamic\s*\(/);

assert.match(tabPrefetch, /prefetchSicurezzaTabQueries/);
assert.match(tabPrefetch, /page-matrix/);
assert.match(tabPrefetch, /security-recent/);

assert.match(budget, /route: "\/sicurezza"/);
assert.match(budget, /security\.usersPermissions/);

assert.match(layout, /verifyServerPageWrite\("sicurezza"\)/);

assert.match(registry, /security\.usersPermissions/);

assert.ok(getPrefetchRoutesForScope("security.usersPermissions").includes("/sicurezza"));
assert.ok(getPrefetchRoutesForScope("settings.payload").includes("/sicurezza"));

console.log("sicurezza-perf-policy.test.ts OK");
