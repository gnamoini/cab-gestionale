import assert from "node:assert/strict";
import { mezzoLogOggettoLabelFromRow, logModificaRowToMezziHubLogEntry } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { buildMezziGestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import type { MezzoRow } from "@/src/types/supabase-tables";

function mezzoRow(partial: Partial<MezzoRow> & Pick<MezzoRow, "id">): MezzoRow {
  return {
    cliente: "Tech Servizi",
    utilizzatore: null,
    marca: "Bucher",
    modello: "Citycat 5000",
    targa: "AA123BB",
    matricola: "70188038",
    numero_scuderia: null,
    tipo_attrezzatura: "Spazzatrice",
    anno: 2024,
    meta: {},
    created_at: "2026-06-12T00:00:00Z",
    updated_at: "2026-06-12T00:00:00Z",
    ...partial,
  };
}

{
  const label = mezzoLogOggettoLabelFromRow(mezzoRow({ id: "m1" }));
  assert.match(label, /Bucher/i);
  assert.match(label, /Citycat/i);
  assert.match(label, /Tech Servizi/i);
  assert.match(label, /AA123BB/);
}

{
  const entry = logModificaRowToMezziHubLogEntry(
    {
      id: "log-1",
      entita: "mezzi",
      entita_id: "m1",
      azione: "CREATE",
      autore_id: "5d421a15-0000-0000-0000-000000000000",
      created_at: "2026-06-12T15:41:00Z",
      payload: { snapshot: mezzoRow({ id: "m1" }) },
      profiles: { id: "5d421a15-0000-0000-0000-000000000000", nome: "Giorgio" },
    },
    { currentUserId: null, currentDisplayName: "" },
  );
  assert.equal(entry.autore, "Giorgio");
  assert.match(entry.mezzo, /Bucher/i);
  const vm = buildMezziGestionaleLogViewModel(entry);
  assert.match(vm.modificaRiga, /Giorgio ha registrato il mezzo/i);
  assert.match(vm.oggettoRiga, /Bucher/i);
}

{
  const entry = logModificaRowToMezziHubLogEntry(
    {
      id: "log-mezzo-resolved",
      entita: "mezzi",
      entita_id: "96edd259-0000-0000-0000-000000000001",
      azione: "MEZZO_RESOLVED_EXISTING",
      autore_id: "5d421a15-0000-0000-0000-000000000000",
      created_at: "2026-07-25T18:37:00Z",
      payload: {
        mezzo_id: "96edd259-0000-0000-0000-000000000001",
        matched_by: "targa_norm",
        incoming_ident: { targa: "GF004AT", vin: null },
        conflicts: [],
      },
      profiles: { id: "5d421a15-0000-0000-0000-000000000000", nome: "Giorgio" },
    },
    { currentUserId: null, currentDisplayName: "" },
  );
  assert.equal(entry.autore, "Giorgio");
  assert.equal(entry.mezzo, "GF004AT");
  assert.equal(entry.tipoRiga, "COLLEGAMENTO MEZZO");
  const vm = buildMezziGestionaleLogViewModel(entry);
  assert.match(vm.modificaRiga, /Collegato al mezzo già presente/i);
  assert.doesNotMatch(vm.modificaRiga, /MEZZO_RESOLVED_EXISTING/);
  assert.equal(vm.tipoRiga, "COLLEGAMENTO MEZZO");
}

console.log("mezzi-log-label.test.ts OK");
