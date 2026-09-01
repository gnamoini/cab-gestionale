import { formatIdentificazioneMezzoLine } from "@/lib/mezzi/identificazione-mezzo";
import type { InterventoContext } from "@/lib/domain/intervento-context/intervento-context.types";
import { resolveInterventoDisplay } from "@/lib/domain/intervento-context/resolve-intervento-display";

/** Identificazione macchina derivata dal contesto canonico (non da snapshot stale). */
export function resolveIdentificazioneMacchinaFromContext(ctx: InterventoContext): string {
  const display = resolveInterventoDisplay(ctx);
  return formatIdentificazioneMezzoLine({
    targa: display.targa.value,
    matricola: display.matricola.value,
    nScuderia: display.nScuderia.value,
    marcaAttrezzatura: display.marcaAttrezzatura.value,
    modelloAttrezzatura: display.modelloAttrezzatura.value,
    cliente: display.cliente.value,
    cantiere: display.cantiere.value,
    utilizzatore: display.utilizzatore.value,
    marcaTelaio: display.marcaTelaio.value,
    modelloTelaio: display.modelloTelaio.value,
    vin: display.vin.value,
  });
}

/** Read ufficiale: canonical se ctx disponibile, altrimenti legacy persistito. */
export function resolveIdentificazioneMacchinaRead(
  ctx: InterventoContext | null | undefined,
  legacyPersisted: string | null | undefined,
): string {
  if (ctx) {
    const fromCanonical = resolveIdentificazioneMacchinaFromContext(ctx).trim();
    if (fromCanonical) return fromCanonical;
  }
  const legacy = (legacyPersisted ?? "").trim();
  return legacy;
}
