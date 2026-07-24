import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { DescrizionePreventivoContext } from "@/lib/preventivi/preventivi-descrizione-aggregator";
import {
  buildPersistGenerationPayload,
  generatePreventivoDescriptionAsync,
  markOverridesObsolete,
  persistGenerationClient,
  type DescriptionGenerationProgress,
} from "@/lib/preventivi/description-engine";

/** Rigenera descrizione da scheda lavorazioni persistita in DB (solo bozze). */
export async function regeneratePreventivoDescription(
  record: PreventivoRecord,
  ctx: DescrizionePreventivoContext,
  opts?: {
    autore?: string;
    generationSequence?: number;
    onProgress?: (progress: DescriptionGenerationProgress) => void;
  },
): Promise<PreventivoRecord> {
  const lavorazioneId = record.lavorazioneId?.trim();
  if (!lavorazioneId) {
    throw new Error("Rigenerazione descrizione richiede una lavorazione collegata.");
  }

  const generated = await generatePreventivoDescriptionAsync({
    lavorazioneId,
    ctx,
    targetType: record.targetType,
    tipoAttrezzatura: record.tipoAttrezzatura,
    marcaModello: [record.marcaAttrezzatura, record.modelloAttrezzatura].filter(Boolean).join(" "),
    generationSequence: opts?.generationSequence,
    onProgress: opts?.onProgress,
  });

  const composed = generated.composed;

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
    descrizioneLavorazioniCliente: generated.description,
    descrizioneLavorazioniTecnicaSorgente: generated.technicalBlob,
    descrizioneGenerataAuto: generated.description,
    descriptionGenerationId: composed.meta.generationId,
    descriptionEngineMeta: {
      ...composed.meta,
      operatorOverrides: obsoleteOverrides,
    },
  };
}
