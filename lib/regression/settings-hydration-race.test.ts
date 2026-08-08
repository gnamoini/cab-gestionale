import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const layout = read("app/(gestionale)/layout.tsx");
assert.match(layout, /prefetchGestionaleLayoutSettings/);
assert.match(layout, /GestionaleHydrationBoundary/);
assert.match(layout, /boundary="layout"/);

const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
assert.match(prefetch, /export async function prefetchGestionaleLayoutSettings/);
assert.match(prefetch, /getAppSettingsPayloadReadServer/);

const lavCritical = prefetch.match(/export async function prefetchCriticalPage[\s\S]*?^}/m)?.[0] ?? "";
assert.doesNotMatch(lavCritical, /prefetchSettingsPayload/);

const settingsHook = read("src/hooks/gestionale/use-settings-queries.ts");
assert.match(settingsHook, /isOwner \? !hasHydratedPayload/);

console.log("settings-hydration-race.test.ts OK");
