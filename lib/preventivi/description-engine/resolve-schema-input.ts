import type { ClientDescriptionSchemaInput } from "./client-description-schema";
import type { DescriptionEngineInput } from "./types";

/** @deprecated Non usare in produzione — input deve arrivare dal resolver DB. */
export function resolveSchemaInputFromSchede(): Pick<
  ClientDescriptionSchemaInput,
  "anomaliaText" | "lavorazioniLines"
> {
  return {};
}

export function mergeDescriptionEngineSchemaInput(
  input: DescriptionEngineInput,
): ClientDescriptionSchemaInput {
  return {
    anomaliaText: input.anomaliaText,
    lavorazioniLines: input.lavorazioniLines,
    technicalBlob: input.technicalBlob,
    ctx: input.ctx,
  };
}

/** @deprecated Usare resolver DB via generatePreventivoDescriptionAsync. */
export function schemaInputFromPreventivoRecord(): Pick<
  ClientDescriptionSchemaInput,
  "anomaliaText" | "lavorazioniLines"
> {
  return {};
}
