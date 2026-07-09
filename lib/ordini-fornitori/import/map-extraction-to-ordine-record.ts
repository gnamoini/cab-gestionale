import { applyFornitoreLabelToRecord, buildEmptyOrdineFornitore } from "@/lib/ordini-fornitori/build-empty-ordine-fornitore";
import {
  ordineFornitoreFornitoreSnapshotToRecord,
  type OrdineFornitoreFornitoreSnapshot,
} from "@/lib/ordini-fornitori/fornitore-snapshot";
import { getFornitoreAnagraficaSettings } from "@/lib/magazzino/fornitore-anagrafica";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import { parseRicambioUnitaMisura } from "@/lib/magazzino/ricambio-unita-misura";
import { ordineFornitoreLogisticaToRecord } from "@/lib/ordini-fornitori/ordine-fornitore-logistica";
import { defaultOrdineRigaMeta, patchRigaMeta } from "@/lib/ordini-fornitori/ordine-fornitore-riga-meta";
import {
  buildEmptyOrdineSpesaVariaRiga,
  ORDINE_RIGA_META_SPESA_VARIA,
} from "@/lib/ordini-fornitori/ordine-fornitore-spesa-varia";
import { calcolaTotaliOrdineFornitore, totaleNettoRigaOrdine } from "@/lib/ordini-fornitori/ordine-fornitore-totals";
import type { OrdineFornitoreRecord, OrdineFornitoreRiga } from "@/lib/ordini-fornitori/types";
import { computeImportQuality } from "@/lib/ordini-fornitori/import/compute-import-quality";
import { formatRiferimentoOrdineFromPreventivo } from "@/lib/ordini-fornitori/import/format-riferimento-ordine";
import { lookupFornitoreByPivaCfName } from "@/lib/ordini-fornitori/import/lookup-fornitore.server";
import type { ImportSourceRef } from "@/lib/import-sources/types";
import type { OrdineFornitoreImportExtraction } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-schema";
import {
  countMatchedRighe,
  resolveImportRighe,
  type ResolvedImportRiga,
} from "@/lib/ordini-fornitori/import/ordine-fornitore-import-resolver.server";
import {
  fieldConfidence,
  fieldValue,
  parseLocaleNumber,
} from "@/lib/ordini-fornitori/import/parse-locale-number";
import type {
  FornitoreMatchResult,
  ImportQuality,
  OrdineFornitoreImportAnalyzeResult,
} from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";
import type { ImportDuplicateCheck } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

function parseIsoDate(raw: string): string {
  const v = raw.trim();
  if (!v) return new Date().toISOString().slice(0, 10);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const it = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(v);
  if (it) {
    const dd = it[1].padStart(2, "0");
    const mm = it[2].padStart(2, "0");
    return `${it[3]}-${mm}-${dd}`;
  }
  return new Date().toISOString().slice(0, 10);
}

function buildOggettoRiga(r: ResolvedImportRiga, ivaDefault: number): OrdineFornitoreRiga {
  const um = parseRicambioUnitaMisura(r.unitaMisura);
  const meta = patchRigaMeta(defaultOrdineRigaMeta(r.ivaPercent || ivaDefault), {
    unitaMisura: um,
    ivaPercent: r.ivaPercent || ivaDefault,
  });
  const base = {
    id: crypto.randomUUID(),
    ordine: 0,
    ricambioId: r.ricambioId,
    codice: r.codice,
    descrizione: r.descrizione,
    quantita: r.quantita,
    prezzoUnitario: r.prezzoUnitario,
    scontoPercent: r.scontoPercent,
    totaleRiga: 0,
    unitaMisura: um,
    ivaPercent: r.ivaPercent || ivaDefault,
    meta,
  };
  return { ...base, totaleRiga: totaleNettoRigaOrdine(base) };
}

function buildSpesaRiga(descrizione: string, importo: number, ivaDefault: number): OrdineFornitoreRiga {
  const riga = buildEmptyOrdineSpesaVariaRiga(ivaDefault);
  return {
    ...riga,
    id: crypto.randomUUID(),
    descrizione: descrizione.trim() || "Spesa accessoria",
    prezzoUnitario: importo,
    totaleRiga: importo,
  };
}

function headerConfidence(extraction: OrdineFornitoreImportExtraction): number {
  const f = extraction.fornitore;
  const d = extraction.documento;
  const parts = [
    fieldConfidence(f?.ragioneSociale),
    fieldConfidence(f?.partitaIva),
    fieldConfidence(d?.numeroPreventivo),
    fieldConfidence(d?.data),
  ].filter((x) => x > 0);
  if (!parts.length) return 0.4;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

function righeConfidence(extraction: OrdineFornitoreImportExtraction): number {
  if (!extraction.righe.length) return 0;
  let sum = 0;
  for (const r of extraction.righe) {
    sum +=
      (fieldConfidence(r.descrizione) +
        fieldConfidence(r.codice) +
        fieldConfidence(r.quantita) +
        fieldConfidence(r.prezzoUnitario)) /
      4;
  }
  return sum / extraction.righe.length;
}

export function mapExtractionToOrdineRecord(input: {
  extraction: OrdineFornitoreImportExtraction;
  magazzinoItems: RicambioMagazzino[];
  magazzinoMaster: MagazzinoMasterPrefs;
  existingOrdini: readonly Pick<OrdineFornitoreRecord, "numero">[];
  source: ImportSourceRef;
  contentHash: string;
  semanticKey: string | null;
  duplicates: ImportDuplicateCheck;
  aiWarnings?: string[];
}): OrdineFornitoreImportAnalyzeResult {
  const { extraction, magazzinoMaster } = input;
  const f = extraction.fornitore;
  const d = extraction.documento;

  const ragioneSociale = fieldValue(f?.ragioneSociale);
  const partitaIva = fieldValue(f?.partitaIva);
  const codiceFiscale = fieldValue(f?.codiceFiscale);
  const aiConf = Math.max(fieldConfidence(f?.ragioneSociale), fieldConfidence(f?.partitaIva), 0.4);

  const fornitoreMatch: FornitoreMatchResult = lookupFornitoreByPivaCfName(
    {
      partitaIva,
      codiceFiscale,
      ragioneSociale,
    },
    magazzinoMaster,
    aiConf,
  );

  let record = buildEmptyOrdineFornitore(input.existingOrdini);

  if (fornitoreMatch.matched) {
    record = applyFornitoreLabelToRecord(
      record,
      fornitoreMatch.label,
      getFornitoreAnagraficaSettings(magazzinoMaster, fornitoreMatch.label),
    );
  } else {
    const snap: OrdineFornitoreFornitoreSnapshot =
      fornitoreMatch.snapshotProposal ??
      ({
        label: fornitoreMatch.label,
        ragioneSociale: ragioneSociale || fornitoreMatch.label,
        partitaIva,
        codiceFiscale,
        indirizzo: fieldValue(f?.indirizzo),
        telefono: fieldValue(f?.telefono) || "+39",
      } as OrdineFornitoreFornitoreSnapshot);
    record = {
      ...record,
      fornitoreLabel: fornitoreMatch.label,
      fornitoreSnapshot: ordineFornitoreFornitoreSnapshotToRecord(snap),
    };
  }

  const dataPreventivo = parseIsoDate(fieldValue(d?.data));
  record.dataOrdine = dataPreventivo;

  const numeroPreventivo = fieldValue(d?.numeroPreventivo);
  const logistica = {
    riferimentoOrdine: formatRiferimentoOrdineFromPreventivo(numeroPreventivo, dataPreventivo),
    dataConsegna: fieldValue(d?.tempiConsegna),
    metodoPagamento: fieldValue(d?.condizioniPagamento),
    aspettoEsteriore: "",
    trasportoCura: "" as const,
    causaleTrasporto: "",
    porto: "",
    numeroColli: "",
    peso: "",
    vettore: "",
  };

  record.logisticaSnapshot = ordineFornitoreLogisticaToRecord(logistica);

  const noteParts = [fieldValue(d?.note), fieldValue(d?.validita) ? `Validità: ${fieldValue(d?.validita)}` : ""].filter(
    Boolean,
  );
  if (noteParts.length) record.note = noteParts.join("\n");

  const resolvedRighe = resolveImportRighe(extraction, input.magazzinoItems, record.fornitoreLabel, record.ivaPercent);
  const oggetti = resolvedRighe.map((r) => buildOggettoRiga(r, record.ivaPercent));

  const spese: OrdineFornitoreRiga[] = [];
  for (const costo of extraction.costiAggiuntivi) {
    const importo = parseLocaleNumber(fieldValue(costo.importo), { decimals: 2, min: 0 });
    if (!importo || importo <= 0) continue;
    const tipo = costo.tipo ?? "altro";
    const desc =
      fieldValue(costo.descrizione) ||
      (tipo === "trasporto"
        ? "Spese di trasporto"
        : tipo === "raee"
          ? "Contributo RAEE"
          : tipo === "imballo"
            ? "Imballo"
            : "Spesa accessoria");
    spese.push(buildSpesaRiga(desc, importo, record.ivaPercent));
  }

  record.righe = [...oggetti, ...spese].map((r, i) => ({ ...r, ordine: i + 1 }));

  const totals = calcolaTotaliOrdineFornitore({
    righe: record.righe,
    trasporto: 0,
    ivaPercent: record.ivaPercent,
  });
  record = {
    ...record,
    imponibileRighe: totals.imponibileRighe,
    trasporto: 0,
    imponibile: totals.imponibile,
    iva: totals.iva,
    totale: totals.totale,
  };

  const quality: ImportQuality = computeImportQuality({
    headerConfidence: headerConfidence(extraction),
    righeConfidence: righeConfidence(extraction),
    fornitoreMatchMethod: fornitoreMatch.matchMethod,
    matchedRigheCount: countMatchedRighe(resolvedRighe),
    totalRigheCount: resolvedRighe.length,
  });

  const warnings = [...(input.aiWarnings ?? []), ...(extraction.warnings ?? [])];
  if (input.duplicates.hashDuplicate) {
    warnings.push("Questo file è già stato importato in un ordine esistente.");
  }
  if (input.duplicates.semanticDuplicate) {
    warnings.push("Esiste già un ordine con stesso fornitore, numero e data preventivo.");
  }

  return {
    record,
    quality,
    warnings,
    duplicates: input.duplicates,
    source: input.source,
    contentHash: input.contentHash,
    semanticKey: input.semanticKey,
    fornitoreMatch,
    matchedRigheCount: countMatchedRighe(resolvedRighe),
    totalRigheCount: resolvedRighe.length,
  };
}
