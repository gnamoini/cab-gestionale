import assert from "node:assert/strict";
import { resolveMezzoFromScheda } from "@/lib/domain/mezzo/resolve-mezzo-from-scheda";
import { mergeSchedaIngressoWithMezzoPriority } from "@/lib/schede/merge-scheda-ingresso-with-mezzo-priority";
import {
  canPrefillSchedaFromMezzo,
  resolveMezzoPrefillPolicy,
} from "@/lib/schede/scheda-ingresso-mezzo-prefill-policy";
import {
  collectMezzoCandidates,
  scoreIngressoMezzoCandidates,
  resolveIngressoMezzoMatchFromCatalog,
} from "@/lib/schede/scheda-ingresso-mezzo-match";
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
    vin: partial.vin,
  };
}

const baseFields: SchedaIngressoFields = {
  dataIngresso: "01/01/2026",
  cliente: "",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "M",
  modelloAttrezzatura: "",
  matricola: "",
  nScuderia: "",
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
};

// Test #1 — caso produzione scuderia 8
const mezzoA = mezzo({
  id: "m-a",
  cliente: "Alfa",
  numeroScuderia: "8",
  matricola: "123",
});
const mezzoB = mezzo({
  id: "m-b",
  cliente: "Beta",
  numeroScuderia: "8",
  matricola: "456",
});
const prodCatalog = [mezzoA, mezzoB];
const prodScheda: SchedaIngressoFields = {
  ...baseFields,
  cliente: "Alfa",
  nScuderia: "8",
  matricola: "123",
};

const prodCandidates = collectMezzoCandidates({ scheda: prodScheda, catalog: prodCatalog });
assert.ok(prodCandidates.some((m) => m.id === "m-a"));
assert.ok(prodCandidates.some((m) => m.id === "m-b"));

const prodScored = scoreIngressoMezzoCandidates({ scheda: prodScheda, candidates: prodCandidates });
assert.equal(prodScored.status, "needs_confirm");
if (prodScored.status === "needs_confirm") {
  assert.equal(prodScored.candidate.mezzo.id, "m-a");
  const scoreB = prodScored.candidates.find((c) => c.mezzo.id === "m-b");
  assert.ok(prodScored.candidate.score > (scoreB?.score ?? 0));
  assert.equal(prodScored.reason.confidence, "medium");
}

const prodResolved = resolveMezzoFromScheda({
  scheda: prodScheda,
  existingMezzi: prodCatalog,
});
assert.equal(prodResolved.matchKind, "needs_confirm");
assert.equal(prodResolved.mezzoId, null);

const noPrefillPolicy = resolveMezzoPrefillPolicy({
  linkStatus: "unconfirmed_match",
  linkOrigin: null,
});
assert.equal(noPrefillPolicy, "no_prefill");
assert.equal(canPrefillSchedaFromMezzo(noPrefillPolicy), false);

const mergedBlocked = mergeSchedaIngressoWithMezzoPriority(prodScheda, {
  linkedMezzo: mezzoB,
  prefillPolicy: "no_prefill",
});
assert.equal(mergedBlocked.cliente, "Alfa");
assert.notEqual(mergedBlocked.matricola, "456");

// Test #2 — scuderia duplicata senza ident completo
const ambScheda: SchedaIngressoFields = { ...baseFields, nScuderia: "8" };
const ambMatch = resolveIngressoMezzoMatchFromCatalog(ambScheda, prodCatalog);
assert.equal(ambMatch.status, "ambiguous");

// Test #3 — pick manuale
const manualPolicy = resolveMezzoPrefillPolicy({
  linkStatus: "linked",
  linkOrigin: "selected_by_user",
  confirmed: true,
});
assert.equal(manualPolicy, "manual_selected");
assert.ok(canPrefillSchedaFromMezzo(manualPolicy));

const explicit = resolveMezzoFromScheda({
  scheda: prodScheda,
  existingMezzi: prodCatalog,
  preferredMezzoId: "m-b",
});
assert.equal(explicit.matchKind, "explicit");
assert.equal(explicit.mezzoId, "m-b");

// Test #4 — VIN unico
const vinMezzo = mezzo({
  id: "m-vin",
  cliente: "V",
  vin: "WVWZZZ1JZ3W386752",
  targa: "—",
  matricola: "—",
});
const vinScheda: SchedaIngressoFields = {
  ...baseFields,
  vin: "WVWZZZ1JZ3W386752",
};
const vinMatch = resolveIngressoMezzoMatchFromCatalog(vinScheda, [vinMezzo]);
assert.equal(vinMatch.status, "needs_confirm");
if (vinMatch.status === "needs_confirm") {
  assert.equal(vinMatch.reason.confidence, "certain");
}
const vinResolved = resolveMezzoFromScheda({
  scheda: vinScheda,
  existingMezzi: [vinMezzo],
});
assert.equal(vinResolved.matchKind, "needs_confirm");

// Test #5 — nessun candidato
const emptyMatch = resolveIngressoMezzoMatchFromCatalog(
  { ...baseFields, cliente: "Nuovo", targa: "XX000YY" },
  prodCatalog,
);
assert.equal(emptyMatch.status, "not_found");

console.log("scheda-ingresso-mezzo-match.test.ts OK");
