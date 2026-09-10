/**
 * Stabilità salvataggio cliente su scheda ingresso edit — dirty, gate, reconcile.
 */
import assert from "node:assert/strict";
import { detectMezzoAnagraficaChanges } from "@/lib/domain/mezzo/detect-mezzo-anagrafica-changes";
import { isMezzoUpdateSchedaOnly, MEZZO_UPDATE_SCHEDA_ONLY } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import { pickMezzoPermanentFields } from "@/lib/schede/scheda-ingresso-field-roles";
import { permanentFieldsDiffer } from "@/lib/schede/merge-scheda-ingresso-with-mezzo-priority";
import { resolveMezzoLinkConfirmationDecision } from "@/lib/schede/scheda-ingresso-mezzo-link-confirmation-policy";
import type { SchedaIngressoFields } from "@/types/schede";
import type { MezzoGestito } from "@/lib/mezzi/types";

function baseFields(cliente = "Cliente A"): SchedaIngressoFields {
  return {
    cliente,
    cantiere: "",
    utilizzatore: "",
    targetType: "telaio",
    attrezzaturaId: "",
    tipoAttrezzatura: "",
    marcaAttrezzatura: "",
    modelloAttrezzatura: "",
    matricola: "MAT-001",
    nScuderia: "",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    targa: "AB123CD",
    vin: "",
    km: "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    dataIngresso: "07/09/2026",
    oreLavoro: "",
    richiedente: "",
    richiedenteTelefono: "",
    addettoAccettazione: "",
    addettoAccettazioneId: "",
    richiedenteFirma: "",
    addettoFirma: "",
  };
}

const mezzoStub = (cliente: string): MezzoGestito =>
  ({
    id: "mezzo-1",
    cliente,
    cantiere: "",
    utilizzatore: "",
    marca: "",
    modello: "",
    matricola: "MAT-001",
    targa: "AB123CD",
    ultimaModifica: "2026-09-07T10:00:00.000Z",
  }) as MezzoGestito;

// 1. A → B: dopo reconcile snapshot, gate non deve rilevare diff
{
  const atLink = pickMezzoPermanentFields(baseFields("Cliente A"));
  const saved = baseFields("Cliente B");
  const afterReconcile = pickMezzoPermanentFields(saved);
  const detected = detectMezzoAnagraficaChanges(afterReconcile, saved);
  assert.equal(detected.changes.length, 0, "post-reconcile: nessun diff cliente");
  assert.equal(
    detectMezzoAnagraficaChanges(atLink, saved).changes.some((c) => c.field === "cliente"),
    true,
    "pre-reconcile: cliente cambiato",
  );
}

// 2. Stesso cliente: nessuna mutation mezzo necessaria
{
  const fields = baseFields("Cliente A");
  const snap = pickMezzoPermanentFields(fields);
  assert.equal(detectMezzoAnagraficaChanges(snap, fields).changes.length, 0);
  assert.equal(isMezzoUpdateSchedaOnly(MEZZO_UPDATE_SCHEDA_ONLY), true);
}

// 3. Mezzo link gate skip su edit già collegato
{
  const decision = resolveMezzoLinkConfirmationDecision({
    entryOrigin: "new_mezzo",
    scheda: baseFields("Cliente B"),
    catalog: [mezzoStub("Cliente A")],
    preferredMezzoId: "mezzo-1",
    linkedOrigin: "selected_by_user",
  });
  assert.equal(decision.action, "skip");
  if (decision.action === "skip") {
    assert.equal(decision.reason, "already_linked");
  }
}

// 4. permanentFieldsDiffer coerente con JSON dirty
{
  const a = baseFields("Cliente A");
  const b = baseFields("Cliente B");
  const diff = permanentFieldsDiffer(a, b);
  assert.ok(diff.includes("cliente"));
  assert.equal(permanentFieldsDiffer(b, b).length, 0);
}

// 5. Cambio cliente + altro campo permanente = un solo set di changes
{
  const atLink = pickMezzoPermanentFields(baseFields("Cliente A"));
  const saved = { ...baseFields("Cliente B"), cantiere: "Cantiere X" };
  const changes = detectMezzoAnagraficaChanges(atLink, saved).changes;
  assert.equal(changes.length, 2);
  assert.ok(changes.some((c) => c.field === "cliente"));
  assert.ok(changes.some((c) => c.field === "cantiere"));
}

console.log("scheda-ingresso-cliente-save-stability.test.ts: ok");
