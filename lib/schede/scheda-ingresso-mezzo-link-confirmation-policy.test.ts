import assert from "node:assert/strict";
import {
  isEquipmentIdentityEquivalent,
  isTrustedMezzoMatch,
  resolveMezzoLinkConfirmationDecision,
} from "@/lib/schede/scheda-ingresso-mezzo-link-confirmation-policy";
import type { IngressoMezzoScoredCandidate } from "@/lib/schede/scheda-ingresso-mezzo-match";
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

const mezzoA = mezzo({
  id: "m-a",
  cliente: "Alfa",
  targa: "AA001BB",
  matricola: "123",
  marca: "Rossi",
  modello: "X200",
  numeroScuderia: "8",
});
const mezzoB = mezzo({
  id: "m-b",
  cliente: "Beta",
  targa: "ZZ999YY",
  matricola: "456",
  numeroScuderia: "8",
});
const catalog = [mezzoA, mezzoB];

// isEquipmentIdentityEquivalent
assert.equal(isEquipmentIdentityEquivalent("ROSSI", "X200", "Rossi", "x-200"), true);
assert.equal(isEquipmentIdentityEquivalent("ROSSI", "X200", "—", "x-200"), false);
assert.equal(isEquipmentIdentityEquivalent("", "X200", "Rossi", "x-200"), false);

// catalog_selected + prelinked → skip inviolabile
const catalogSkip = resolveMezzoLinkConfirmationDecision({
  entryOrigin: "catalog_selected",
  scheda: { ...baseFields, targa: mezzoB.targa },
  catalog,
  prelinkedMezzoId: "m-a",
});
assert.equal(catalogSkip.action, "skip");
if (catalogSkip.action === "skip") {
  assert.equal(catalogSkip.reason, "catalog_prelinked");
  assert.equal(catalogSkip.preferredMezzoId, "m-a");
  assert.equal(catalogSkip.linkOrigin, "selected_by_user");
}

// catalog_selected + targa verso altro mezzo → resta m-a
const catalogTargaChanged = resolveMezzoLinkConfirmationDecision({
  entryOrigin: "catalog_selected",
  scheda: { ...baseFields, targa: "ZZ999YY" },
  catalog,
  prelinkedMezzoId: "m-a",
});
assert.equal(catalogTargaChanged.action, "skip");
if (catalogTargaChanged.action === "skip") {
  assert.equal(catalogTargaChanged.reason, "catalog_prelinked");
  assert.equal(catalogTargaChanged.preferredMezzoId, "m-a");
}

// already_linked
const alreadyLinked = resolveMezzoLinkConfirmationDecision({
  entryOrigin: "new_mezzo",
  scheda: baseFields,
  catalog,
  preferredMezzoId: "m-a",
  linkedOrigin: "selected_by_user",
});
assert.equal(alreadyLinked.action, "skip");
if (alreadyLinked.action === "skip") {
  assert.equal(alreadyLinked.reason, "already_linked");
}

// new_mezzo, no match
const noMatch = resolveMezzoLinkConfirmationDecision({
  entryOrigin: "new_mezzo",
  scheda: { ...baseFields, targa: "XX000YY" },
  catalog,
});
assert.equal(noMatch.action, "skip");
if (noMatch.action === "skip") {
  assert.equal(noMatch.reason, "create_new");
  assert.equal(noMatch.preferredMezzoId, null);
}

// new_mezzo, solo scuderia → no_trusted_match
const scuderiaOnly = resolveMezzoLinkConfirmationDecision({
  entryOrigin: "new_mezzo",
  scheda: { ...baseFields, nScuderia: "8" },
  catalog,
});
assert.equal(scuderiaOnly.action, "skip");
if (scuderiaOnly.action === "skip") {
  assert.equal(scuderiaOnly.reason, "no_trusted_match");
}

// new_mezzo, match targa → confirm
const targaMatch = resolveMezzoLinkConfirmationDecision({
  entryOrigin: "new_mezzo",
  scheda: { ...baseFields, targa: "AA001BB" },
  catalog,
});
assert.equal(targaMatch.action, "confirm");
if (targaMatch.action === "confirm") {
  assert.equal(targaMatch.match.candidate.mezzo.id, "m-a");
}

// new_mezzo, matricola + marca/modello → confirm
const matricolaTrusted = resolveMezzoLinkConfirmationDecision({
  entryOrigin: "new_mezzo",
  scheda: {
    ...baseFields,
    matricola: "123",
    marcaAttrezzatura: "Rossi",
    modelloAttrezzatura: "X200",
  },
  catalog,
});
assert.equal(matricolaTrusted.action, "confirm");

// new_mezzo, matricola senza marca/modello → no_trusted_match
const matricolaUntrusted = resolveMezzoLinkConfirmationDecision({
  entryOrigin: "new_mezzo",
  scheda: { ...baseFields, matricola: "123", cliente: "Alfa" },
  catalog,
});
assert.equal(matricolaUntrusted.action, "skip");
if (matricolaUntrusted.action === "skip") {
  assert.equal(matricolaUntrusted.reason, "no_trusted_match");
}

// isTrustedMezzoMatch unit
const scoredTarga: IngressoMezzoScoredCandidate = {
  mezzo: mezzoA,
  score: 100,
  matchedFields: ["targa"],
  confidence: "high",
};
assert.equal(isTrustedMezzoMatch({ ...baseFields, targa: "AA001BB" }, scoredTarga), true);

const scoredScuderia: IngressoMezzoScoredCandidate = {
  mezzo: mezzoA,
  score: 80,
  matchedFields: ["nScuderia", "cliente"],
  confidence: "low",
};
assert.equal(isTrustedMezzoMatch({ ...baseFields, nScuderia: "8" }, scoredScuderia), false);

// VIN match
const vinMezzo = mezzo({
  id: "m-vin",
  vin: "WVWZZZ1JZ3W386752",
  targa: "—",
  matricola: "—",
});
const vinConfirm = resolveMezzoLinkConfirmationDecision({
  entryOrigin: "new_mezzo",
  scheda: { ...baseFields, vin: "WVWZZZ1JZ3W386752" },
  catalog: [vinMezzo],
});
assert.equal(vinConfirm.action, "confirm");

console.log("scheda-ingresso-mezzo-link-confirmation-policy.test.ts OK");
