import {
  applyFornitoreLabelToRecord,
  buildEmptyOrdineFornitore,
} from "@/lib/ordini-fornitori/build-empty-ordine-fornitore";
import {
  ordineFornitoreFornitoreSnapshotToRecord,
  type OrdineFornitoreFornitoreSnapshot,
} from "@/lib/ordini-fornitori/fornitore-snapshot";
import { getFornitoreAnagraficaSettings } from "@/lib/magazzino/fornitore-anagrafica";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import { parseRicambioUnitaMisura } from "@/lib/magazzino/ricambio-unita-misura";
import { defaultOrdineRigaMeta, patchRigaMeta } from "@/lib/ordini-fornitori/ordine-fornitore-riga-meta";
import { totaleNettoRigaOrdine } from "@/lib/ordini-fornitori/ordine-fornitore-totals";
import type { OrdineFornitoreRecord, OrdineFornitoreRiga } from "@/lib/ordini-fornitori/types";
import { calcolaTotaliOrdineFornitore } from "@/lib/ordini-fornitori/ordine-fornitore-totals";
import type { SparePartOrderPrefill } from "@/lib/ordini-fornitori/identifica-ricambio/types";

const IDENTIFICA_RIGA_META = "identificaPriceSource";

function buildRigaFromPrefill(prefill: SparePartOrderPrefill, ivaDefault = 22): OrdineFornitoreRiga {
  const um = parseRicambioUnitaMisura("pz");
  const meta = patchRigaMeta(defaultOrdineRigaMeta(ivaDefault), {
    unitaMisura: um,
    ivaPercent: ivaDefault,
  });
  if (prefill.prezzoSource.label) {
    meta[IDENTIFICA_RIGA_META] = prefill.prezzoSource;
  }
  const base = {
    id: crypto.randomUUID(),
    ordine: 1,
    ricambioId: prefill.resolution.matchKind === "exact" ? prefill.resolution.ricambioId : null,
    codice: prefill.codice ?? "",
    descrizione: prefill.descrizione,
    quantita: prefill.quantita,
    prezzoUnitario: prefill.prezzoSuggerito ?? 0,
    scontoPercent: 0,
    totaleRiga: 0,
    unitaMisura: um,
    ivaPercent: ivaDefault,
    meta,
  };
  return { ...base, totaleRiga: totaleNettoRigaOrdine(base) };
}

function applySuggestedFornitore(
  record: OrdineFornitoreRecord,
  label: string,
  snapshot?: OrdineFornitoreFornitoreSnapshot,
): OrdineFornitoreRecord {
  if (!label.trim()) return record;
  return {
    ...record,
    fornitoreLabel: label.trim(),
    fornitoreSnapshot: snapshot
      ? ordineFornitoreFornitoreSnapshotToRecord(snapshot)
      : record.fornitoreSnapshot,
  };
}

export function mapPrefillToOrdineRecord(input: {
  prefill: SparePartOrderPrefill;
  magazzinoMaster: MagazzinoMasterPrefs;
  existingOrdini: readonly Pick<OrdineFornitoreRecord, "numero">[];
  fornitoreSnapshotProposal?: OrdineFornitoreFornitoreSnapshot;
}): OrdineFornitoreRecord {
  const { prefill, magazzinoMaster, existingOrdini, fornitoreSnapshotProposal } = input;
  let record = buildEmptyOrdineFornitore(existingOrdini);
  const noteParts = [prefill.note].filter(Boolean);
  if (noteParts.length) record = { ...record, note: noteParts.join("\n\n") };

  if (prefill.fornitoreMode === "identified" && prefill.fornitoreLabel) {
    record = applyFornitoreLabelToRecord(
      record,
      prefill.fornitoreLabel,
      getFornitoreAnagraficaSettings(magazzinoMaster, prefill.fornitoreLabel),
    );
  } else if (prefill.fornitoreMode === "suggested" && prefill.fornitoreLabel) {
    record = applySuggestedFornitore(record, prefill.fornitoreLabel, fornitoreSnapshotProposal);
  }

  const riga = buildRigaFromPrefill(prefill);
  const totals = calcolaTotaliOrdineFornitore({
    righe: [riga],
    trasporto: 0,
    ivaPercent: record.ivaPercent,
  });
  return {
    ...record,
    righe: [riga],
    imponibileRighe: totals.imponibileRighe,
    imponibile: totals.imponibile,
    iva: totals.iva,
    totale: totals.totale,
  };
}
