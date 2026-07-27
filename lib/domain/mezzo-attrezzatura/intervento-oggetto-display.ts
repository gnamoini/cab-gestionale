import type { InterventoContext } from "@/lib/domain/intervento-context/intervento-context.types";
import {
  interventoTargetBadge,
  interventoTargetLabel,
} from "@/lib/domain/mezzo-attrezzatura/intervento-target";
import { resolveInterventoDisplay } from "@/lib/domain/intervento-context/resolve-intervento-display";

export type InterventoOggettoDisplay = {
  label: string;
  badge: string;
  subtitle: string;
};

/** Omette vuoti e placeholder «—». */
function joinMarcaModello(...parts: Array<string | null | undefined>): string {
  return parts
    .map((s) => (s ?? "").trim())
    .filter((s) => s.length > 0 && s !== "—")
    .join(" ");
}

/** Etichetta colonna «Oggetto» per liste lavorazioni. */
export function resolveInterventoOggettoDisplay(ctx: InterventoContext): InterventoOggettoDisplay {
  const { target } = ctx;
  if (target.targetType === "telaio") {
    const display = resolveInterventoDisplay(ctx);
    const telaio =
      joinMarcaModello(ctx.schedaIngresso.campi?.marcaTelaio, ctx.schedaIngresso.campi?.modelloTelaio) ||
      joinMarcaModello(ctx.mezzo.marca, ctx.mezzo.modello) ||
      joinMarcaModello(display.marcaModello.value) ||
      "Telaio";
    return {
      label: telaio,
      badge: interventoTargetBadge("telaio"),
      subtitle: ctx.ident.targa || display.targa.value,
    };
  }

  const att = target.attrezzatura;
  const label = interventoTargetLabel("attrezzatura", joinMarcaModello(att.marca, att.modello));
  return {
    label: label === "Attrezzatura" ? joinMarcaModello(att.marca) || "" : label,
    badge: interventoTargetBadge("attrezzatura", att.marca),
    subtitle: att.matricola === "—" ? "" : att.matricola,
  };
}
