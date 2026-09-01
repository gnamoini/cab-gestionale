import { auditInterventoContext } from "@/lib/domain/intervento-context/intervento-audit";
import { normalizeInterventoIdent } from "@/lib/domain/intervento-context/intervento-ident";
import type {
  InterventoContext,
  InterventoDisplay,
  InterventoDisplayField,
  InterventoIdent,
  InterventoSourceOfTruth,
} from "@/lib/domain/intervento-context/intervento-context.types";
import {
  ingressoDisplayFieldsFromContext,
  resolveIngressoFieldDisplay,
  resolveIngressoMarcaModelloDisplay,
} from "@/lib/domain/intervento-context/resolve-ingresso-field-display";
import { schedaIngressoRecordExists } from "@/lib/domain/intervento-context/scheda-ingresso-read-policy";

function primarySourceFromDisplay(display: Omit<InterventoDisplay, "primarySource" | "ident">): InterventoSourceOfTruth {
  const fields = [
    display.cliente,
    display.marcaModello,
    display.targa,
    display.matricola,
    display.nScuderia,
  ];
  if (fields.some((f) => f.source === "scheda" && f.value)) return "scheda";
  if (fields.some((f) => f.source === "scheda")) return "scheda";
  if (fields.some((f) => f.source === "lavorazione" && f.value)) return "lavorazione";
  return "mezzo";
}

/** Ident per display: scheda record → solo snapshot; assente → layer ident. */
export function resolveInterventoIdent(ctx: InterventoContext): InterventoIdent {
  if (schedaIngressoRecordExists(ctx)) {
    const c = ctx.schedaIngresso.campi!;
    return normalizeInterventoIdent({
      targa: c.targa,
      matricola: c.matricola,
      nScuderia: c.nScuderia,
    });
  }
  return { ...ctx.ident };
}

export function resolveInterventoDisplay(ctx: InterventoContext): InterventoDisplay {
  const flat = ingressoDisplayFieldsFromContext(ctx);
  const marcaModello = resolveIngressoMarcaModelloDisplay(ctx);

  const display: Omit<InterventoDisplay, "primarySource"> = {
    cliente: flat.cliente,
    utilizzatore: flat.utilizzatore,
    cantiere: flat.cantiere,
    marcaModello,
    marcaAttrezzatura: flat.marcaAttrezzatura,
    modelloAttrezzatura: flat.modelloAttrezzatura,
    tipoAttrezzatura: flat.tipoAttrezzatura,
    marcaTelaio: flat.marcaTelaio,
    modelloTelaio: flat.modelloTelaio,
    tipoTelaio: flat.tipoTelaio,
    vin: flat.vin,
    targa: flat.targa,
    matricola: flat.matricola,
    nScuderia: flat.nScuderia,
    ident: resolveInterventoIdent(ctx),
  };

  const resolved: InterventoDisplay = {
    ...display,
    primarySource: primarySourceFromDisplay(display),
  };

  auditInterventoContext(ctx, "display", {
    sourceOfTruthUsed: resolved.primarySource,
    mismatch: ctx.meta.hasIdentMismatch,
  });

  return resolved;
}

/** Etichetta macchina per lista (parità con lavorazioneMacchinaLabel). */
export function interventoMacchinaLabel(display: InterventoDisplay): string {
  const v = display.marcaModello.value.trim();
  return v || "—";
}

/** Etichetta cliente per lista (parità con lavorazioneClienteLabel). */
export function interventoClienteLabel(display: InterventoDisplay): string {
  return display.cliente.value.trim() || "—";
}

/** Etichetta ident mezzo per lista (parità con lavorazioneMezzoIdent). */
export function interventoMezzoIdentLabel(display: InterventoDisplay): string {
  const p = display.ident;
  const parts = [p.targa, p.matricola, p.nScuderia ? `N. ${p.nScuderia}` : ""].filter(Boolean);
  return parts.join(" · ");
}

/** Singolo campo flat — wrapper per consumer UI. */
export function resolveIngressoFieldDisplayForContext(
  ctx: InterventoContext,
  key: Parameters<typeof resolveIngressoFieldDisplay>[1],
): InterventoDisplayField {
  return resolveIngressoFieldDisplay(ctx, key);
}
