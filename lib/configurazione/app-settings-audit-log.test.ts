import assert from "node:assert/strict";
import {
  buildGestionaleLogViewModelFromAppSettingsAuditRow,
  resolveAppSettingsAuditAuthorName,
} from "@/lib/configurazione/app-settings-audit-log";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";
import type { AppSettingsAuditRow } from "@/src/types/supabase-tables";

const baseRow = (): AppSettingsAuditRow => ({
  id: "1",
  module: CAB_SETTINGS_MODULE.magazzino,
  key: CAB_SETTINGS_KEY.master,
  old_value: { marche: ["Bosch"], categorie: [], mezziCompatibili: [], fornitori: [], produttori: [] },
  new_value: {
    marche: ["Bosch", "Mann"],
    categorie: [],
    mezziCompatibili: [],
    fornitori: [],
    produttori: [],
  },
  updated_by: "5fcda421-0000-4000-8000-000000000001",
  updated_at: "2026-08-04T12:13:00.000Z",
});

{
  const vm = buildGestionaleLogViewModelFromAppSettingsAuditRow(baseRow());
  assert.equal(vm.oggettoRiga, "Magazzino");
  assert.equal(vm.tipoRiga, "MODIFICA CONFIGURAZIONE");
  assert.match(vm.modificaRiga, /Aggiunto marca ricambio «Mann»/);
  assert.equal(vm.autore, "Utente");
}

{
  const vm = buildGestionaleLogViewModelFromAppSettingsAuditRow({
    ...baseRow(),
    updated_by_profile: { nome: "Mario", cognome: "Rossi" },
  });
  assert.equal(vm.autore, "Mario Rossi");
  assert.match(vm.modificaRiga, /Mario Rossi ha aggiornato «Magazzino»/);
}

{
  assert.equal(
    resolveAppSettingsAuditAuthorName({
      ...baseRow(),
      updated_by: null,
      updated_by_profile: null,
    }),
    "Sistema",
  );
}

console.log("app-settings-audit-log.test.ts OK");
