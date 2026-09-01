import assert from "node:assert/strict";
import { resolveInterventoOggettoDisplay } from "@/lib/domain/mezzo-attrezzatura/intervento-oggetto-display";
import type {
  InterventoCatalogSnapshot,
  InterventoContext,
  MezzoSnapshot,
} from "@/lib/domain/intervento-context/intervento-context.types";

function emptyMezzo(over: Partial<MezzoSnapshot> = {}): MezzoSnapshot {
  return {
    id: "m1",
    cliente: "",
    utilizzatore: "",
    marca: "",
    modello: "",
    targa: "",
    matricola: "",
    nScuderia: "",
    tipoAttrezzatura: "",
    cantiere: "",
    marcaTelaio: "",
    modelloTelaio: "",
    tipoTelaio: "",
    vin: "",
    present: true,
    ...over,
  };
}

function catalog(
  att: Partial<InterventoCatalogSnapshot["attrezzatura"]>,
  mezzo: MezzoSnapshot = emptyMezzo(),
): InterventoCatalogSnapshot {
  return {
    attrezzatura: {
      id: "a1",
      marca: "",
      modello: "",
      matricola: "",
      tipoAttrezzatura: "",
      ...att,
    },
    mezzo,
  };
}

function baseCtx(over: Partial<InterventoContext> = {}): InterventoContext {
  return {
    contextId: "l1",
    lavorazioneId: "l1",
    lavorazione: {
      id: "l1",
      mezzoId: "m1",
      dataIngresso: null,
      note: null,
      cliente: "",
      utilizzatore: "",
      cantiere: "",
      targa: "",
      matricola: "",
      nScuderia: "",
    },
    mezzo: emptyMezzo(),
    schedaIngresso: { present: false, sorgente: null, updatedAt: null, campi: null },
    catalog: catalog({ marca: "Fortunato", modello: "—", matricola: "CS023" }),
    ident: { targa: "", matricola: "", nScuderia: "" },
    meta: { schedaMissing: true, mezzoUnlinked: false, hasIdentMismatch: false },
    target: {
      targetType: "attrezzatura",
      attrezzatura: { id: "a1", marca: "", modello: "", matricola: "", present: true },
    },
    ...over,
  };
}

// Caso C — bootstrap catalogo
assert.equal(resolveInterventoOggettoDisplay(baseCtx()).label, "Fortunato");
assert.equal(
  resolveInterventoOggettoDisplay(
    baseCtx({
      catalog: catalog({ marca: "OMB", modello: "T-Rex", matricola: "CS023" }),
    }),
  ).label,
  "OMB T-Rex",
);

// Caso B — scheda presente + marca vuota → no fallback catalogo
assert.equal(
  resolveInterventoOggettoDisplay(
    baseCtx({
      schedaIngresso: {
        present: true,
        sorgente: "generata",
        updatedAt: null,
        campi: {
          dataIngresso: "",
          cliente: "",
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
        },
      },
      meta: { schedaMissing: false, mezzoUnlinked: false, hasIdentMismatch: false },
      catalog: catalog({ marca: "Doppstadt", modello: "Cilindro" }),
    }),
  ).label,
  "",
);

// Caso A — scheda valorizzata vince su catalogo
assert.equal(
  resolveInterventoOggettoDisplay(
    baseCtx({
      schedaIngresso: {
        present: true,
        sorgente: "generata",
        updatedAt: null,
        campi: {
          dataIngresso: "",
          cliente: "",
          cantiere: "",
          utilizzatore: "",
          tipoAttrezzatura: "Spazzatrice",
          marcaAttrezzatura: "Nextra",
          modelloAttrezzatura: "K-MD24T",
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
        },
      },
      meta: { schedaMissing: false, mezzoUnlinked: false, hasIdentMismatch: false },
      catalog: catalog({ marca: "Altro", modello: "X" }),
    }),
  ).label,
  "Spazzatrice Nextra K-MD24T",
);

console.log("intervento-oggetto-display.test.ts OK");
