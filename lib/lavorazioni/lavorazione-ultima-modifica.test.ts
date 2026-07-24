import assert from "node:assert/strict";
import {
  buildLavorazioneRowProfileResolver,
  buildLatestLogAutoreByEntitaId,
  buildLogAutoreByUserId,
  displayLavorazioneAutore,
  formatLavorazioneUltimaModificaLine,
  resolveLavorazioneUltimaModifica,
} from "@/lib/lavorazioni/lavorazione-ultima-modifica";
import type { LavorazioneSchedeBundle } from "@/types/schede";

const rowUpdatedAt = "2026-05-25T15:14:00.000Z";
const sampleUserUuid = "5d421a15-bc22-4759-b3f5-39aaff40b05c";

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
        vin: "",
        targa: "",
        km: "",
        descrizioneAnomalia: "",
        livelloCarburante: "",
        addettoAccettazione: overrides.addetto ?? "Angelo",
        richiedente: "",
    richiedenteTelefono: "",
      },
    },
  };
}

{
  const row = { updated_at: rowUpdatedAt, updated_by: sampleUserUuid, updated_by_nome: "Donato Verdi" };
  const info = resolveLavorazioneUltimaModifica(
    row,
    ingressoBundle({ updatedBy: "Angelo", addetto: "Angelo" }),
    { resolveUserId: buildLavorazioneRowProfileResolver(row) },
  );
  assert.equal(info.autore, "Donato Verdi");
  assert.equal(info.iso, rowUpdatedAt);
}

{
  const row = {
    updated_at: rowUpdatedAt,
    created_at: rowUpdatedAt,
    created_by: sampleUserUuid,
    created_by_nome: "Angelo Creatore",
  };
  const info = resolveLavorazioneUltimaModifica(
    row,
    ingressoBundle({ updatedBy: "Angelo", addetto: "Angelo" }),
    { resolveUserId: buildLavorazioneRowProfileResolver(row) },
  );
  assert.equal(info.autore, "Angelo Creatore");
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
  const schedaUpdatedAt = "2026-06-03T09:37:00.000Z";
  const info = resolveLavorazioneUltimaModifica(
    { updated_at: rowUpdatedAt },
    ingressoBundle({ updatedAt: schedaUpdatedAt, updatedBy: sampleUserUuid }),
    {
      autoreLog: "Marco Rossi",
      resolveUserId: (id) => (id === sampleUserUuid ? "Donato Verdi" : undefined),
    },
  );
  assert.equal(info.autore, "Donato Verdi");
  assert.equal(info.iso, schedaUpdatedAt);
}

{
  assert.equal(
    displayLavorazioneAutore(sampleUserUuid, "Marco Rossi", (id) =>
      id === sampleUserUuid ? "Donato Verdi" : undefined,
    ),
    "Donato Verdi",
  );
  assert.equal(displayLavorazioneAutore(sampleUserUuid, "Marco Rossi"), "Marco Rossi");
}

{
  const map = buildLogAutoreByUserId(
    [
      {
        id: "1",
        entita: "lavorazioni",
        entita_id: "a",
        azione: "UPDATE",
        autore_id: "u1",
        payload: null,
        created_at: "2026-05-25T10:00:00.000Z",
        profiles: { id: "u1", nome: "Donato" },
      },
    ],
    () => "Donato",
  );
  assert.equal(map.get("u1"), "Donato");
}

{
  const sameInstant = "2026-05-28T13:34:00.000Z";
  const info = resolveLavorazioneUltimaModifica(
    { updated_at: sameInstant },
    ingressoBundle({
      updatedAt: sameInstant,
      updatedBy: "Donato Verdi",
      addetto: "Angelo",
    }),
  );
  assert.equal(info.autore, "Donato Verdi");
  assert.equal(info.iso, sameInstant);
}

{
  const rowIso = "2026-05-28T13:34:00.000Z";
  const schedaIso = "2026-05-28T13:34:00.450Z";
  const info = resolveLavorazioneUltimaModifica(
    { updated_at: rowIso },
    ingressoBundle({
      updatedAt: schedaIso,
      updatedBy: "Donato Verdi",
      addetto: "Angelo",
    }),
  );
  assert.equal(info.autore, "Donato Verdi");
  assert.equal(info.iso, schedaIso);
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

{
  const info = resolveLavorazioneUltimaModifica(
    { updated_at: rowUpdatedAt, updated_by: sampleUserUuid },
    null,
    { omitUnresolvedAutore: true },
  );
  assert.equal(info.autore, "");
}

console.log("lavorazione-ultima-modifica.test.ts OK");
