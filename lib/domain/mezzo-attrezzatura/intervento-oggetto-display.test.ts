import assert from "node:assert/strict";
import { resolveInterventoOggettoDisplay } from "@/lib/domain/mezzo-attrezzatura/intervento-oggetto-display";
import type { InterventoContext } from "@/lib/domain/intervento-context/intervento-context.types";

function baseCtx(over: Partial<InterventoContext> & { marca?: string; modello?: string }): InterventoContext {
  return {
    lavorazione: {
      id: "l1",
      cliente: "",
      utilizzatore: "",
      cantiere: "",
      targa: "",
      matricola: "",
      nScuderia: "",
    },
    mezzo: {
      id: "m1",
      cliente: "",
      utilizzatore: "",
      cantiere: "",
      marca: "",
      modello: "",
      targa: "",
      matricola: "",
      nScuderia: "",
    },
    schedaIngresso: { campi: null },
    ident: { targa: "", matricola: "", nScuderia: "" },
    meta: { hasIdentMismatch: false },
    target: {
      targetType: "attrezzatura",
      attrezzatura: {
        id: "a1",
        marca: over.marca ?? "Fortunato",
        modello: over.modello ?? "—",
        matricola: "CS023",
        tipoAttrezzatura: "",
      },
    },
    ...over,
  } as InterventoContext;
}

assert.equal(resolveInterventoOggettoDisplay(baseCtx({})).label, "Fortunato");
assert.equal(
  resolveInterventoOggettoDisplay(baseCtx({ marca: "OMB", modello: "T-Rex" })).label,
  "OMB T-Rex",
);
assert.equal(resolveInterventoOggettoDisplay(baseCtx({ marca: "—", modello: "—" })).label, "");

console.log("intervento-oggetto-display.test.ts OK");
