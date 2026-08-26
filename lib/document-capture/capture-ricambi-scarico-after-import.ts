"use client";

import type { QueryClient } from "@tanstack/react-query";
import { applyMagazzinoScaricoDaScheda } from "@/lib/magazzino/apply-scarico-da-scheda";
import { ensureSchedeBundlesInCache, persistSchedeBundle } from "@/lib/schede/schede-sync-adapter";
import type { SchedaRicambiFields } from "@/types/schede";

export type CaptureRicambiScaricoResult = {
  applied: number;
  failed: Array<{ label: string; error: string }>;
};

/** ponytail: scarico batch post-import — stock via API, flag su scheda se persist ok. */
export async function applyCaptureRicambiScarichiAfterImport(opts: {
  fields: SchedaRicambiFields;
  lavorazioneId: string;
  identLine: string;
  autore: string;
  qc: QueryClient;
}): Promise<CaptureRicambiScaricoResult> {
  const rows = opts.fields.righe.filter(
    (r) => r.scaricoMagazzinoRichiesto && r.ricambioId && !r.scaricoMagazzinoApplicato,
  );
  if (rows.length === 0) return { applied: 0, failed: [] };

  const failed: Array<{ label: string; error: string }> = [];
  let applied = 0;

  for (const row of rows) {
    if (!row.scaricoOperationId) {
      row.scaricoOperationId = crypto.randomUUID();
    }
    const res = await applyMagazzinoScaricoDaScheda({
      ricambioId: row.ricambioId!,
      lavorazioneId: opts.lavorazioneId,
      quantita: row.quantita,
      autore: opts.autore,
      riepilogo: `Import scheda ricambi · ${opts.identLine}`,
      qc: opts.qc,
      scaricoOperationId: row.scaricoOperationId,
    });
    if (res.ok) {
      applied += 1;
      row.scaricoMagazzinoApplicato = true;
      row.scaricoMagazzinoRichiesto = false;
      row.scaricoOperationId = res.operationId;
    } else {
      failed.push({
        label: row.ricambioNome || row.codice || row.id,
        error: res.error,
      });
    }
  }

  if (applied > 0) {
    try {
      const store = await ensureSchedeBundlesInCache(opts.qc, [opts.lavorazioneId]);
      const bundle = store[opts.lavorazioneId];
      if (bundle?.ricambi?.campi) {
        const rowById = new Map(opts.fields.righe.map((r) => [r.id, r]));
        const righe = bundle.ricambi.campi.righe.map((r) => {
          const patched = rowById.get(r.id);
          if (!patched?.scaricoMagazzinoApplicato) return r;
          return {
            ...r,
            scaricoMagazzinoApplicato: true,
            scaricoMagazzinoRichiesto: false,
          };
        });
        await persistSchedeBundle({
          ...bundle,
          ricambi: {
            ...bundle.ricambi,
            campi: { ...bundle.ricambi.campi, righe },
          },
        });
      }
    } catch (persistErr) {
      failed.push({
        label: "persist_scheda_flags",
        error: persistErr instanceof Error ? persistErr.message : "Persist flag scheda fallito",
      });
    }
  }

  return { applied, failed };
}
