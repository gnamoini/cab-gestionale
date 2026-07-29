import assert from "node:assert/strict";
import { detectMezzoAnagraficaChanges } from "@/lib/domain/mezzo/detect-mezzo-anagrafica-changes";
import { pickMezzoPermanentFields } from "@/lib/schede/scheda-ingresso-field-roles";
import type { SchedaIngressoFields } from "@/types/schede";

const base = (): SchedaIngressoFields => ({
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

const original = pickMezzoPermanentFields(base());

// matricola changed
{
  const current = pickMezzoPermanentFields({ ...base(), matricola: "XYZ999" });
  const result = detectMezzoAnagraficaChanges(original, current);
  assert.equal(result.hasChanges, true);
  assert.ok(result.changes.some((c) => c.field === "matricola"));
  assert.equal(result.changes.find((c) => c.field === "matricola")?.oldValue, "ABC123");
  assert.equal(result.changes.find((c) => c.field === "matricola")?.newValue, "XYZ999");
}

// empty → valued
{
  const current = pickMezzoPermanentFields({ ...base(), vin: "VIN123" });
  const result = detectMezzoAnagraficaChanges(original, current);
  assert.ok(result.changes.some((c) => c.field === "vin"));
  assert.equal(result.changes.find((c) => c.field === "vin")?.oldValue, "—");
  assert.equal(result.changes.find((c) => c.field === "vin")?.newValue, "VIN123");
}

// cliente changed (association field)
{
  const current = pickMezzoPermanentFields({ ...base(), cliente: "Cliente B" });
  const result = detectMezzoAnagraficaChanges(original, current);
  assert.ok(result.changes.some((c) => c.field === "cliente"));
}

// no changes on lavorazione-only fields (not in permanent slice)
{
  const current = pickMezzoPermanentFields({ ...base(), descrizioneAnomalia: "nuova anomalia" });
  const result = detectMezzoAnagraficaChanges(original, current);
  assert.equal(result.hasChanges, false);
}

// no changes
{
  const result = detectMezzoAnagraficaChanges(original, original);
  assert.equal(result.hasChanges, false);
  assert.equal(result.changes.length, 0);
}

console.log("detect-mezzo-anagrafica-changes.test.ts: ok");
