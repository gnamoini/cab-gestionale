/**
 * Policy: propagazione impostazioni → consumer via SETTINGS_PAYLOAD_QK SSOT.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { QueryClient } from "@tanstack/react-query";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { resolveCabAppSettingsFromRows } from "@/src/lib/app-settings/resolve-from-rows";
import {
  patchAppSettingsQueryCache,
  SETTINGS_PAYLOAD_QK,
} from "@/lib/sync/patch-app-settings-query-cache";
import type { AppSettingRow } from "@/src/types/supabase-tables";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const persist = read("lib/sync/persist-settings-record.ts");
assert.match(persist, /patchAppSettingsQueryCache/);
assert.match(persist, /dispatchGestionaleAction/);
assert.match(persist, /invalidateMicSettings\(qc,\s*\{[\s\S]*refetchType:\s*"none"/);
assert.match(persist, /preserveRuntimeCache:\s*upsertedRows\.length > 0/);

const settingsQueries = read("src/hooks/gestionale/use-settings-queries.ts");
assert.match(settingsQueries, /SETTINGS_PAYLOAD_QK\s*=\s*\[\.\.\.QK\.settings,\s*"payload"\]/);

const realtime = read("src/components/gestionale-realtime-bridge.tsx");
assert.doesNotMatch(
  realtime.match(/if \(table === "app_settings"\)[\s\S]*?return;/)?.[0] ?? "",
  /if \(shouldSuppressSettingsRemoteNotify\(\)\) return;/,
  "suppress notify must not block app_settings invalidate",
);
assert.match(realtime, /scheduleInvalidate\(table, cabEvent\)/);

function testPatchAppSettingsQueryCache(): void {
  const qc = new QueryClient();
  const liste = createMezziListePrefsDefault();
  liste.clienti = ["Cliente Alpha"];

  const initialRow: AppSettingRow = {
    module: CAB_SETTINGS_MODULE.mezzi,
    key: CAB_SETTINGS_KEY.liste,
    value: liste as unknown as Record<string, unknown>,
    updated_at: "2026-01-01T00:00:00Z",
    updated_by: null,
  };

  qc.setQueryData(SETTINGS_PAYLOAD_QK, {
    rows: [initialRow],
    resolved: resolveCabAppSettingsFromRows([initialRow], null),
  });

  const updatedListe = { ...liste, clienti: ["Cliente Alpha", "Cliente Beta E2E"] };
  const upserted: AppSettingRow = {
    ...initialRow,
    value: updatedListe as unknown as Record<string, unknown>,
    updated_at: "2026-01-02T00:00:00Z",
  };

  patchAppSettingsQueryCache(qc, [upserted]);

  const cached = qc.getQueryData<{ resolved: { mezziListe: { clienti: string[] } } }>(SETTINGS_PAYLOAD_QK);
  assert.ok(cached?.resolved.mezziListe.clienti.includes("Cliente Beta E2E"));
  assert.equal(cached?.resolved.mezziListe.clienti.length, 2);
}

testPatchAppSettingsQueryCache();

console.log("settings-consumer-propagation-policy.test.ts: ok");
