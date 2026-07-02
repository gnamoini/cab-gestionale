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

/** Etichetta colonna «Oggetto» per liste lavorazioni. */
export function resolveInterventoOggettoDisplay(ctx: InterventoContext): InterventoOggettoDisplay {
  const { target } = ctx;
  if (target.targetType === "telaio") {
    const display = resolveInterventoDisplay(ctx);
    const telaio = [ctx.schedaIngresso.campi?.marcaTelaio, ctx.schedaIngresso.campi?.modelloTelaio]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(" ");
    const label =
      telaio ||
      [ctx.mezzo.marca, ctx.mezzo.modello].filter(Boolean).join(" ").trim() ||
      display.marcaModello.value.trim() ||
      "Telaio";
    return {
      label,
      badge: interventoTargetBadge("telaio"),
      subtitle: ctx.ident.targa || display.targa.value,
    };
  }

  const att = target.attrezzatura;
  const label = interventoTargetLabel(
    "attrezzatura",
    [att.marca, att.modello].filter(Boolean).join(" "),
  );
  return {
    label: label === "Attrezzatura" ? att.marca || "—" : label,
    badge: interventoTargetBadge("attrezzatura", att.marca),
    subtitle: att.matricola,
  };
}
