/**
 * Badge schede: ensure lazy cache non rifetcha bundle già presenti (anche vuoti).
 * Il contatore lista deve aggiornarsi subito via optimistic update al persist.
 */
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { ensureSchedeBundlesInCache } from "@/lib/schede/schede-sync-adapter";
import { SCHEde_BUNDLES_QUERY_KEY } from "@/src/lib/react-query/query-keys";
import { lavorazioneClienteLabel, lavorazioneSchedeBundleRevision } from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import { countSchedePresenti } from "@/lib/schede/schede-ui";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeBundle } from "@/types/schede";

const lavId = "lav-test-001";

const emptyBundle: LavorazioneSchedeBundle = {
  lavorazioneId: lavId,
  codice: null,
  ingresso: null,
  lavorazioni: null,
  ricambi: null,
};

const withIngresso: LavorazioneSchedeBundle = {
  ...emptyBundle,
  ingresso: {
    tipo: "ingresso",
    sorgente: "generata",
    fileEsterno: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "Test",
    updatedBy: "Test",
    campi: {
      dataIngresso: "01/01/2026",
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
      addettoAccettazione: "",
      richiedente: "",
    richiedenteTelefono: "",
      noteIntervento: "",
    },
  },
};

async function run(): Promise<void> {
  const qc = new QueryClient();
  qc.setQueryData(SCHEde_BUNDLES_QUERY_KEY, { [lavId]: { ...emptyBundle, _fetchedAt: Date.now() } });

  const afterEnsure = await ensureSchedeBundlesInCache(qc, [lavId]);
  assert.equal(countSchedePresenti(afterEnsure[lavId]!), 0, "ensure mantiene bundle vuoto già fetchato");

  qc.setQueryData(SCHEde_BUNDLES_QUERY_KEY, { [lavId]: withIngresso });
  const optimistic = qc.getQueryData<Record<string, LavorazioneSchedeBundle>>(SCHEde_BUNDLES_QUERY_KEY);
  assert.equal(countSchedePresenti(optimistic![lavId]), 1, "optimistic update mostra subito 1/3");

  const modifiedIngresso: LavorazioneSchedeBundle = {
    ...withIngresso,
    ingresso: withIngresso.ingresso
      ? {
          ...withIngresso.ingresso,
          updatedAt: "2026-06-11T12:00:00.000Z",
          campi: { ...withIngresso.ingresso.campi, cliente: "Cliente Modificato" },
        }
      : null,
  };
  qc.setQueryData(SCHEde_BUNDLES_QUERY_KEY, { [lavId]: modifiedIngresso });
  const afterModify = qc.getQueryData<Record<string, LavorazioneSchedeBundle>>(SCHEde_BUNDLES_QUERY_KEY);
  assert.equal(countSchedePresenti(afterModify![lavId]), 1, "modifica scheda: conteggio invariato");
  assert.notEqual(
    lavorazioneSchedeBundleRevision(withIngresso),
    lavorazioneSchedeBundleRevision(modifiedIngresso),
    "fingerprint bundle cambia su modifica",
  );

  const row = { id: lavId, mezzo: null } as LavorazioneListRow;
  assert.equal(
    lavorazioneClienteLabel(row, { [lavId]: modifiedIngresso }),
    "Cliente Modificato",
    "modifica cliente visibile subito in lista",
  );

  const withTwoSchede: LavorazioneSchedeBundle = {
    ...modifiedIngresso,
    lavorazioni: {
      tipo: "lavorazioni",
      sorgente: "generata",
      fileEsterno: null,
      createdAt: "2026-06-11T12:00:00.000Z",
      updatedAt: "2026-06-11T12:00:00.000Z",
      createdBy: "Test",
      updatedBy: "Test",
      campi: { righe: [], identificazioneMacchina: "" },
    },
  };
  assert.equal(countSchedePresenti(withTwoSchede), 2, "aggiunta seconda scheda aggiorna conteggio");

  const afterDelete: LavorazioneSchedeBundle = { ...withTwoSchede, ingresso: null };
  assert.equal(countSchedePresenti(afterDelete), 1, "eliminazione scheda aggiorna conteggio");

  qc.setQueryData(SCHEde_BUNDLES_QUERY_KEY, { [lavId]: emptyBundle });
  const afterForce = await ensureSchedeBundlesInCache(qc, [lavId], { force: true });
  assert.ok(afterForce[lavId], "force refetch anche se key presente");

  qc.setQueryData(SCHEde_BUNDLES_QUERY_KEY, { [lavId]: { ...emptyBundle, _fetchedAt: Date.now() } });
  const afterInvalidate = await ensureSchedeBundlesInCache(qc, [lavId], { afterInvalidate: true });
  assert.ok(afterInvalidate[lavId], "afterInvalidate refetch con policy attiva");
}

void run().then(() => {
  console.log("lavorazioni-schede-badge-cache.test.ts OK");
});
