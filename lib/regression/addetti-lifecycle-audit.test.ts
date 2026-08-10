import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { selectTimesheetEmployeesForDisplay } from "@/lib/dipendenti/dipendenti-employee-display";
import { isLavorazioneAddettoUnassigned, resolveAddettoDisplayLabel } from "@/lib/lavorazioni/resolve-addetto-display";
import type { DipendenteTimesheetEmployeeRow } from "@/lib/dipendenti/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

const root = resolve(import.meta.dirname, "../..");

{
  const viewSrc = readFileSync(resolve(root, "components/gestionale/lavorazioni/lavorazioni-view.tsx"), "utf8");
  assert.match(viewSrc, /globalOpts\.lavorazioni\.addetti\.includes\(clean\)/, "guard onAddettoRow");
  assert.doesNotMatch(viewSrc, /const defaultAddetto = globalOpts/, "no defaultAddetto ghost in view");
}

{
  const row = { id: "x" } as LavorazioneListRow;
  assert.equal(isLavorazioneAddettoUnassigned(row, { schedeStore: {} }), false, "no bundle → non contare come senza addetto");
  assert.equal(resolveAddettoDisplayLabel(row, { schedeStore: {} }), "—");
}

{
  const emp = (partial: Partial<DipendenteTimesheetEmployeeRow>): DipendenteTimesheetEmployeeRow => ({
    id: "d1",
    display_name: "Storico",
    source_addetto_id: "removed",
    source_addetto_name: null,
    in_settings: false,
    employee_type: "ADDETTO",
    attivo: true,
    created_at: "",
    updated_at: "",
    ...partial,
  });
  const currentIds = new Set(["active-add"]);
  const displayed = selectTimesheetEmployeesForDisplay(
    [emp({ id: "hist" }), emp({ id: "active", source_addetto_id: "active-add", in_settings: true })],
    new Set(["hist"]),
    currentIds,
  );
  assert.equal(displayed.length, 2);
}

console.log("addetti-lifecycle-audit.test.ts OK");
