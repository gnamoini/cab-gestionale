import assert from "node:assert/strict";
import {
  SCHEDA_INGRESSO_ANAGRAFICA_FIELD_KEYS,
  SCHEDA_INGRESSO_INGRESSO_FIELD_KEYS,
  schedaIngressoFieldsSliceEqual,
} from "@/lib/schede/scheda-ingresso-form-field-groups";
import type { SchedaIngressoFields } from "@/types/schede";

const base = {
  dataIngresso: "01/01/2026",
  cliente: "A",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "",
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
} satisfies SchedaIngressoFields;

assert.ok(
  !schedaIngressoFieldsSliceEqual(
    base,
    { ...base, richiedenteTelefono: "123" },
    SCHEDA_INGRESSO_ANAGRAFICA_FIELD_KEYS,
  ),
);
assert.ok(
  schedaIngressoFieldsSliceEqual(
    base,
    { ...base, descrizioneAnomalia: "x" },
    SCHEDA_INGRESSO_ANAGRAFICA_FIELD_KEYS,
  ),
);
assert.ok(
  !schedaIngressoFieldsSliceEqual(base, { ...base, dataIngresso: "02/01/2026" }, SCHEDA_INGRESSO_INGRESSO_FIELD_KEYS),
);

console.log("scheda-ingresso-form-field-groups.test.ts OK");
