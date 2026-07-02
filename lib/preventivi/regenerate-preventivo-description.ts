import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { DescrizionePreventivoContext } from "@/lib/preventivi/preventivi-descrizione-aggregator";
import {
  buildPersistGenerationPayload,
  generatePreventivoDescription,
  markOverridesObsolete,
  persistGenerationClient,
} from "@/lib/preventivi/description-engine";

/** Rigenera descrizione da testo tecnico sorgente (solo bozze). */
export function regeneratePreventivoDescription(
  record: PreventivoRecord,
  ctx: DescrizionePreventivoContext,
  opts?: { autore?: string; generationSequence?: number },
): PreventivoRecord {
  const composed = generatePreventivoDescription({
    technicalBlob: record.descrizioneLavorazioniTecnicaSorgente,
    ctx,
    ricambi: record.righeRicambi.map((r) => ({
      ricambioId: r.ricambioId,
      descrizione: r.descrizione,
      codice: r.codiceOE,
    })),
    targetType: record.targetType,
    tipoAttrezzatura: record.tipoAttrezzatura,
    marcaModello: [record.marcaAttrezzatura, record.modelloAttrezzatura].filter(Boolean).join(" "),
    generationSequence: opts?.generationSequence,
  });

  persistGenerationClient(
    buildPersistGenerationPayload({
      composed,
      preventivoId: record.id,
      lavorazioneId: record.lavorazioneId,
      eventType: "regenerated",
      createdBy: opts?.autore ?? record.lastEditedBy,
    }),
  );

  const obsoleteOverrides = markOverridesObsolete(
    record.descriptionEngineMeta?.operatorOverrides ?? [],
    "superseded_by_regeneration",
  );

  return {
    ...record,
    descrizioneLavorazioniCliente: composed.clienteText,
    descrizioneGenerataAuto: composed.clienteText,
    descriptionGenerationId: composed.meta.generationId,
    descriptionEngineMeta: {
      ...composed.meta,
      operatorOverrides: obsoleteOverrides,
    },
  };
}
