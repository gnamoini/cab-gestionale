import type { InterventoContext } from "@/lib/domain/intervento-context/intervento-context.types";
import { resolveInterventoDisplay } from "@/lib/domain/intervento-context/resolve-intervento-display";
import {
  interventoTargetBadge,
  interventoTargetLabel,
} from "@/lib/domain/mezzo-attrezzatura/intervento-target";

export type InterventoOggettoDisplay = {
  label: string;
  badge: string;
  subtitle: string;
};

function joinMarcaModello(...parts: Array<string | null | undefined>): string {
  return parts
    .map((s) => (s ?? "").trim())
    .filter((s) => s.length > 0 && s !== "—")
    .join(" ");
}

function withTipoAttrezzaturaPrefix(tipo: string, base: string): string {
  if (!tipo) return base;
  if (!base) return tipo;
  const lowerBase = base.toLowerCase();
  const lowerTipo = tipo.toLowerCase();
  if (lowerBase === lowerTipo || lowerBase.startsWith(`${lowerTipo} `)) return base;
  return `${tipo} ${base}`;
}

/** Etichetta colonna «Oggetto» per liste lavorazioni — SSOT resolveInterventoDisplay. */
export function resolveInterventoOggettoDisplay(ctx: InterventoContext): InterventoOggettoDisplay {
  const display = resolveInterventoDisplay(ctx);
  const { target } = ctx;

  if (target.targetType === "telaio") {
    const telaio = joinMarcaModello(display.marcaTelaio.value, display.modelloTelaio.value) || "Telaio";
    return {
      label: telaio,
      badge: interventoTargetBadge("telaio"),
      subtitle: display.targa.value || display.ident.targa,
    };
  }

  const marcaModello = joinMarcaModello(
    display.marcaAttrezzatura.value,
    display.modelloAttrezzatura.value,
  );
  const tipo = display.tipoAttrezzatura.value.trim();
  const label = interventoTargetLabel("attrezzatura", marcaModello);
  const base = label === "Attrezzatura" ? joinMarcaModello(display.marcaAttrezzatura.value) || "" : label;
  return {
    label: withTipoAttrezzaturaPrefix(tipo, base),
    badge: interventoTargetBadge("attrezzatura", display.marcaAttrezzatura.value),
    subtitle: display.matricola.value === "—" ? "" : display.matricola.value,
  };
}
