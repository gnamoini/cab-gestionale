import { loadLavorazioneSchedeStore } from "@/lib/schede/lavorazioni-schede-storage";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { ClientDescriptionSchemaInput } from "./client-description-schema";
import type { DescriptionEngineInput } from "./types";

export function resolveSchemaInputFromSchede(
  lavorazioneId: string | undefined,
): Pick<ClientDescriptionSchemaInput, "anomaliaText" | "lavorazioniLines"> {
  const id = lavorazioneId?.trim();
  if (!id) return {};
  const bundle = loadLavorazioneSchedeStore()[id];
  if (!bundle) return {};

  const ing = bundle.ingresso?.campi;
  const lavDoc = bundle.lavorazioni?.tipo === "lavorazioni" ? bundle.lavorazioni : null;
  const lavorazioniLines =
    lavDoc?.campi.righe?.map((row) => row.lavorazioniEffettuate?.trim() ?? "").filter(Boolean) ?? [];

  return {
    anomaliaText: ing?.descrizioneAnomalia?.trim() || undefined,
    lavorazioniLines,
  };
}

export function mergeDescriptionEngineSchemaInput(
  input: DescriptionEngineInput,
): ClientDescriptionSchemaInput {
  const fromSchede = resolveSchemaInputFromSchede(input.lavorazioneId ?? input.ctx.lavorazioneId);
  return {
    anomaliaText: input.anomaliaText ?? fromSchede.anomaliaText,
    lavorazioniLines: input.lavorazioniLines ?? fromSchede.lavorazioniLines,
    technicalBlob: input.technicalBlob,
    ctx: input.ctx,
  };
}

export function schemaInputFromPreventivoRecord(
  record: PreventivoRecord,
): Pick<ClientDescriptionSchemaInput, "anomaliaText" | "lavorazioniLines"> {
  return resolveSchemaInputFromSchede(record.lavorazioneId);
}
