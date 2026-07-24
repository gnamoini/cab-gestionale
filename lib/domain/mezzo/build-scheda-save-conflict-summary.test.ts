import assert from "node:assert/strict";
import { buildSchedaSaveConflictSummary } from "@/lib/domain/mezzo/build-scheda-save-conflict-summary";
import { createLinkedMezzoSnapshot } from "@/lib/schede/scheda-ingresso-mezzo-link-state";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

const empty = (): SchedaIngressoFields => ({
  dataIngresso: "01/01/2026",
  cliente: "AMIU",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "Bucher",
  modelloAttrezzatura: "CityCat",
  matricola: "ABC123",
  nScuderia: "",
  oreLavoro: "",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  vin: "",
  targa: "AB123",
  km: "",
  descrizioneAnomalia: "",
  livelloCarburante: "",
  addettoAccettazione: "",
  richiedente: "",
  richiedenteTelefono: "",
});

const mezzo: MezzoGestito = {
  id: "m1",
  cliente: "AMIU",
  utilizzatore: "",
  marca: "Bucher",
  modello: "CityCat",
  targa: "AB123",
  matricola: "ABC123",
  numeroScuderia: "",
  tipoAttrezzatura: "—",
  anno: 2020,
  oreKm: 5000,
  km: 120000,
  statoAttuale: "",
  dataUltimaUscita: "",
  note: "",
  priorita: "normale",
  ultimaModifica: "2026-01-01T10:00:00.000Z",
};

const snapshot = createLinkedMezzoSnapshot(mezzo, "matricola");
const fields = { ...empty(), matricola: "XYZ999" };
const summary = buildSchedaSaveConflictSummary({ fields, linkedSnapshot: snapshot, mezzo });
assert.equal(summary.hasIssues, true);
assert.ok(summary.anagraficaChanges.some((c) => c.field === "matricola"));

console.log("build-scheda-save-conflict-summary.test.ts: ok");
