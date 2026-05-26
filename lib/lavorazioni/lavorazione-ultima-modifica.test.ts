import assert from "node:assert/strict";
import {
  buildLatestLogAutoreByEntitaId,
  formatLavorazioneUltimaModificaLine,
  resolveLavorazioneUltimaModifica,
} from "@/lib/lavorazioni/lavorazione-ultima-modifica";
import type { LavorazioneSchedeBundle } from "@/types/schede";

const rowUpdatedAt = "2026-05-25T15:14:00.000Z";

function ingressoBundle(overrides: {
  updatedAt?: string;
  createdAt?: string;
  updatedBy?: string;
  addetto?: string;
}): LavorazioneSchedeBundle {
  const createdAt = overrides.createdAt ?? "2026-05-20T10:00:00.000Z";
  const updatedAt = overrides.updatedAt ?? createdAt;
  return {
    lavorazioneId: "lav-1",
    codice: "26-0001",
    lavorazioni: null,
    ricambi: null,
    ingresso: {
      tipo: "ingresso",
      sorgente: "generata",
      fileEsterno: null,
      createdAt,
      updatedAt,
      createdBy: overrides.updatedBy ?? "Angelo",
      updatedBy: overrides.updatedBy ?? "Angelo",
      campi: {
        dataIngresso: "20/05/2026",
        cliente: "Cliente",
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
        targa: "",
        km: "",
        descrizioneAnomalia: "",
        livelloCarburante: "",
        addettoAccettazione: overrides.addetto ?? "Angelo",
        richiedente: "",
        noteIntervento: "",
      },
    },
  };
}

{
  const info = resolveLavorazioneUltimaModifica(
    { updated_at: rowUpdatedAt },
    ingressoBundle({ updatedBy: "Angelo", addetto: "Angelo" }),
    { autoreLog: "Marco Rossi" },
  );
  assert.equal(info.autore, "Marco Rossi");
  assert.equal(info.iso, rowUpdatedAt);
}

{
  const schedaUpdatedAt = "2026-05-25T17:14:00.000Z";
  const info = resolveLavorazioneUltimaModifica(
    { updated_at: rowUpdatedAt },
    ingressoBundle({
      createdAt: "2026-05-20T10:00:00.000Z",
      updatedAt: schedaUpdatedAt,
      updatedBy: "Giulia Bianchi",
      addetto: "Angelo",
    }),
  );
  assert.equal(info.autore, "Giulia Bianchi");
  assert.equal(info.iso, schedaUpdatedAt);
}

{
  const line = formatLavorazioneUltimaModificaLine({
    iso: "2026-05-25T15:14:00.000Z",
    autore: "Marco Rossi",
  });
  assert.ok(line.includes("Marco Rossi"));
  assert.ok(line.includes("·"));
}

{
  const map = buildLatestLogAutoreByEntitaId(
    [
      {
        id: "1",
        entita: "lavorazioni",
        entita_id: "a",
        azione: "UPDATE",
        autore_id: "u1",
        payload: null,
        created_at: "2026-05-25T10:00:00.000Z",
      },
      {
        id: "2",
        entita: "lavorazioni",
        entita_id: "a",
        azione: "UPDATE",
        autore_id: "u2",
        payload: null,
        created_at: "2026-05-24T10:00:00.000Z",
      },
      {
        id: "3",
        entita: "lavorazioni",
        entita_id: "b",
        azione: "UPDATE",
        autore_id: "u3",
        payload: null,
        created_at: "2026-05-23T10:00:00.000Z",
      },
    ],
    (row) => (row.autore_id === "u1" ? "Primo" : row.autore_id === "u2" ? "Secondo" : "Terzo"),
  );
  assert.equal(map.get("a"), "Primo");
  assert.equal(map.get("b"), "Terzo");
}

console.log("lavorazione-ultima-modifica.test.ts OK");
