import assert from "node:assert/strict";
import {
  interventiMezzoDaLavorazioniDb,
  lavorazioneCollegataMezzoDb,
  mezzoHaLavorazioneAttivaDb,
  mezzoHaLavorazioneCollegataDb,
} from "@/lib/mezzi/interventi-from-lavorazioni-db";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MezzoRow } from "@/src/types/supabase-tables";

const mezzoA: MezzoGestito = {
  id: "mezzo-a",
  cliente: "Cliente A",
  utilizzatore: "—",
  marca: "Caterpillar",
  modello: "320",
  targa: "AB123CD",
  matricola: "MAT-001",
  tipoAttrezzatura: "Escavatore",
  anno: 2020,
  oreKm: 0,
  statoAttuale: "Operativo",
  dataUltimaUscita: "2024-01-01",
  note: "",
  priorita: "normale",
};

const mezzoB: MezzoGestito = {
  ...mezzoA,
  id: "mezzo-b",
  cliente: "Cliente B",
};

const mezzoEmbed: MezzoRow = {
  id: "mezzo-a",
  cliente: "Cliente A",
  utilizzatore: null,
  marca: "Caterpillar",
  modello: "320",
  targa: "AB123CD",
  matricola: "MAT-001",
  numero_scuderia: null,
  tipo_attrezzatura: "Escavatore",
  anno: 2020,
  meta: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

function lavRow(overrides: Partial<LavorazioneListRow> & { id: string }): LavorazioneListRow {
  return {
    id: overrides.id,
    mezzo_id: overrides.mezzo_id ?? "mezzo-a",
    stato: overrides.stato ?? "in_lavorazione",
    priorita: overrides.priorita ?? "media",
    data_ingresso: overrides.data_ingresso ?? "2025-01-15",
    data_uscita: overrides.data_uscita ?? null,
    note: overrides.note ?? null,
    created_by: null,
    created_at: overrides.created_at ?? "2025-01-15T00:00:00.000Z",
    updated_at: overrides.updated_at ?? "2025-01-15T00:00:00.000Z",
    archived: overrides.archived ?? false,
    archived_at: overrides.archived_at ?? null,
    deleted_at: overrides.deleted_at ?? null,
    codice: overrides.codice ?? null,
    mezzo: overrides.mezzo !== undefined ? overrides.mezzo : mezzoEmbed,
  };
}

// FK match — in corso
const lavInCorso = lavRow({ id: "lav-1", mezzo_id: "mezzo-a", archived: false });
assert.equal(lavorazioneCollegataMezzoDb(mezzoA, lavInCorso), true);
assert.equal(mezzoHaLavorazioneAttivaDb(mezzoA, [lavInCorso]), true);
assert.equal(mezzoHaLavorazioneCollegataDb(mezzoA, [lavInCorso]), true);

// FK match — archiviata
const lavArchiviata = lavRow({ id: "lav-2", mezzo_id: "mezzo-a", archived: true, data_uscita: "2025-02-01" });
assert.equal(lavorazioneCollegataMezzoDb(mezzoA, lavArchiviata), true);
assert.equal(mezzoHaLavorazioneAttivaDb(mezzoA, [lavArchiviata]), false);
assert.equal(mezzoHaLavorazioneCollegataDb(mezzoA, [lavArchiviata]), true);

// FK diverso ma targa uguale — non collegata a mezzo B
const lavSuMezzoA = lavRow({ id: "lav-3", mezzo_id: "mezzo-a" });
assert.equal(lavorazioneCollegataMezzoDb(mezzoB, lavSuMezzoA), false);

// Soft-deleted — esclusa
const lavDeleted = lavRow({ id: "lav-4", mezzo_id: "mezzo-a", deleted_at: "2025-06-01T00:00:00.000Z" });
assert.equal(lavorazioneCollegataMezzoDb(mezzoA, lavDeleted), false);
assert.equal(interventiMezzoDaLavorazioniDb(mezzoA, [lavDeleted]).length, 0);

// Legacy senza mezzo_id — fuzzy match su targa
const lavLegacy = lavRow({
  id: "lav-5",
  mezzo_id: "",
  mezzo: { ...mezzoEmbed, targa: "AB123CD", matricola: "MAT-001" },
});
assert.equal(lavorazioneCollegataMezzoDb(mezzoA, lavLegacy), true);

// Legacy senza match
const lavNoMatch = lavRow({
  id: "lav-6",
  mezzo_id: "",
  mezzo: { ...mezzoEmbed, targa: "ZZ999ZZ", matricola: "ALTRO", marca: "Volvo", modello: "L90" },
});
assert.equal(lavorazioneCollegataMezzoDb(mezzoA, lavNoMatch), false);

// Conteggio interventi: in corso + archivio, no deleted
const interventi = interventiMezzoDaLavorazioniDb(mezzoA, [lavInCorso, lavArchiviata, lavDeleted]);
assert.equal(interventi.length, 2);
assert.deepEqual(
  interventi.map((i) => i.id).sort(),
  ["lav-1", "lav-2"],
);

// Simula refetch post soft-delete: la lav in corso sparisce dalla lista → conteggio -1
const primaDelete = interventiMezzoDaLavorazioniDb(mezzoA, [lavInCorso, lavArchiviata]);
const dopoDelete = interventiMezzoDaLavorazioniDb(mezzoA, [lavArchiviata]);
assert.equal(primaDelete.length, 2);
assert.equal(dopoDelete.length, 1);

console.log("lavorazione-collegata-mezzo.test.ts OK");
