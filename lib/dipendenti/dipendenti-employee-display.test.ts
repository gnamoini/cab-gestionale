import assert from "node:assert/strict";
import {
  employeeNameLines,
  selectTimesheetEmployeesForDisplay,
} from "@/lib/dipendenti/dipendenti-employee-display";
import type { DipendenteTimesheetEmployeeRow } from "@/lib/dipendenti/types";

function row(
  partial: Partial<DipendenteTimesheetEmployeeRow> & Pick<DipendenteTimesheetEmployeeRow, "id" | "display_name">,
): DipendenteTimesheetEmployeeRow {
  return {
    source_addetto_name: null,
    source_addetto_id: null,
    in_settings: false,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

const currentAddetti = new Set(["add-1", "add-2"]);

{
  const lines = employeeNameLines(row({ id: "1", display_name: "Gaetano Pedone" }), {
    id: "a1",
    nome: "Gaetano",
    cognome: "Pedone",
  });
  assert.equal(lines.nome, "Gaetano");
  assert.equal(lines.cognome, "Pedone");
}

{
  const lines = employeeNameLines(row({ id: "2", display_name: "Angelo" }));
  assert.equal(lines.nome, "Angelo");
  assert.equal(lines.cognome, null);
}

{
  const employees = [
    row({ id: "active-1", display_name: "Attivo", in_settings: true, source_addetto_id: "add-1" }),
    row({ id: "hist-1", display_name: "Storico", in_settings: false, source_addetto_id: "removed" }),
    row({ id: "orphan-empty", display_name: "Demo vuoto", in_settings: false }),
  ];
  const inJune = new Set(["hist-1"]);
  const visible = selectTimesheetEmployeesForDisplay(employees, inJune, currentAddetti);
  assert.equal(visible.length, 2);
  assert.ok(visible.some((e) => e.id === "active-1"));
  assert.ok(visible.some((e) => e.id === "hist-1"));
  assert.ok(!visible.some((e) => e.id === "orphan-empty"));
}

{
  const employees = [
    row({ id: "active-1", display_name: "Attivo", in_settings: true, source_addetto_id: "add-1" }),
    row({ id: "hist-1", display_name: "Storico", in_settings: false, source_addetto_id: "removed" }),
  ];
  const inJuly = new Set<string>();
  const visible = selectTimesheetEmployeesForDisplay(employees, inJuly, currentAddetti);
  assert.equal(visible.length, 1);
  assert.equal(visible[0]?.id, "active-1");
}

{
  const employees = [
    row({ id: "active-1", display_name: "Attivo", in_settings: true, source_addetto_id: "add-1" }),
    row({ id: "stale-1", display_name: "Non in settings", in_settings: true, source_addetto_id: "removed" }),
  ];
  const visible = selectTimesheetEmployeesForDisplay(employees, new Set(), new Set(["add-1"]));
  assert.equal(visible.length, 1);
  assert.equal(visible[0]?.id, "active-1");
}

{
  const employees = [
    row({ id: "new-1", display_name: "Nuovo", in_settings: true, source_addetto_id: "add-new" }),
  ];
  const visible = selectTimesheetEmployeesForDisplay(employees, new Set(), new Set(["add-new"]));
  assert.equal(visible.length, 1);
  assert.equal(visible[0]?.id, "new-1");
}

console.log("dipendenti-employee-display.test.ts OK");
