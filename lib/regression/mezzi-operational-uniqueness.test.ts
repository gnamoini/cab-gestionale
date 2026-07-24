import assert from "node:assert/strict";
import { resolveMezzoFromScheda } from "@/lib/domain/mezzo/resolve-mezzo-from-scheda";
import {
  findMezziByIngressoIdent,
  resolveMezzoByIdentFromCatalog,
} from "@/lib/mezzi/find-mezzo-by-ident";
import { proposeMezzoReconciliation } from "@/lib/mezzi/mezzo-reconciliation";
import { matchMezziImportRow, MEZZI_IMPORT_UPDATE_THRESHOLD } from "@/lib/data-import/entities/mezzi/mezzi-import-match-score";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

function mezzo(partial: Partial<MezzoGestito> & Pick<MezzoGestito, "id">): MezzoGestito {
  return {
    id: partial.id,
    cliente: partial.cliente ?? "Cliente",
    utilizzatore: partial.utilizzatore ?? "—",
    marca: partial.marca ?? "Marca",
    modello: partial.modello ?? "Modello",
    targa: partial.targa ?? "—",
    matricola: partial.matricola ?? "—",
    numeroScuderia: partial.numeroScuderia ?? "—",
    tipoAttrezzatura: partial.tipoAttrezzatura ?? "—",
    anno: partial.anno ?? 2024,
    cantiere: partial.cantiere ?? "—",
    oreKm: partial.oreKm ?? 0,
    statoAttuale: partial.statoAttuale ?? "Operativo",
    dataUltimaUscita: partial.dataUltimaUscita ?? "2024-01-01",
    note: partial.note ?? "",
    priorita: partial.priorita ?? "normale",
  };
}

const catalog: MezzoGestito[] = [
  mezzo({ id: "m-a", cliente: "Comune X", numeroScuderia: "123", targa: "AA111BB" }),
  mezzo({ id: "m-b", cliente: "Azienda Y", numeroScuderia: "123", targa: "BB222CC" }),
];

const fields: SchedaIngressoFields = {
  dataIngresso: "01/01/2026",
  cliente: "C",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "M",
  modelloAttrezzatura: "",
  matricola: "",
  nScuderia: "123",
  oreLavoro: "",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  vin: "",
  targa: "",
  km: "",
  descrizioneAnomalia: "",
  livelloCarburante: "",
  addettoAccettazione: "",
  richiedente: "",
  richiedenteTelefono: "",
  noteIntervento: "",
};

// Duplicati scuderia → ambiguous
const byScuderia = resolveMezzoByIdentFromCatalog(catalog, { nScuderia: "123" });
assert.equal(byScuderia.status, "ambiguous");
assert.equal(byScuderia.status === "ambiguous" ? byScuderia.candidates.length : 0, 2);

assert.equal(findMezziByIngressoIdent(catalog, { nScuderia: "123" }).length, 2);

// preferred vince su ident duplicato
const byPreferred = resolveMezzoFromScheda({
  scheda: { ...fields, targa: "AA111BB" },
  existingMezzi: catalog,
  preferredMezzoId: "m-b",
});
assert.equal(byPreferred.matchKind, "explicit");
assert.equal(byPreferred.mezzoId, "m-b");

// preferred invalido → error
const invalidPreferred = resolveMezzoFromScheda({
  scheda: fields,
  existingMezzi: catalog,
  preferredMezzoId: "missing-id",
});
assert.equal(invalidPreferred.matchKind, "error");

// orphan lavorazione con scuderia duplicata → ambiguous (no attach)
const recon = proposeMezzoReconciliation(catalog, { targa: "", matricola: "", nScuderia: "123" });
assert.equal(recon.status, "ambiguous");

// import: solo scuderia → score basso, no suggest update
const scuderiaOnly = matchMezziImportRow(
  { numero_scuderia: "123", cliente: "Nuovo" },
  [{ id: "m-a", numero_scuderia: "123", cliente: "Comune X" }],
  [],
);
assert.equal(scuderiaOnly.kind, "manual_review");
if (scuderiaOnly.kind === "manual_review") {
  assert.ok(scuderiaOnly.candidates[0]!.score < MEZZI_IMPORT_UPDATE_THRESHOLD);
}

// import: VIN → suggest update
const vinMatch = matchMezziImportRow(
  { telaio: "WVWZZZ1JZ3W386752" },
  [{ id: "m-vin", telaio_num: "WVWZZZ1JZ3W386752" }],
  [],
);
assert.equal(vinMatch.kind, "suggest_update");

console.log("mezzi-operational-uniqueness.test.ts OK");
