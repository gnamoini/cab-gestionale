import {
  composeInterventoContextFromListRow,
  interventoClienteLabel,
  resolveInterventoDisplay,
  resolveInterventoIdent,
} from "@/lib/domain/intervento-context";
import type { InterventoTargetType } from "@/lib/domain/mezzo-attrezzatura/intervento-target";
import { resolveInterventoOggettoDisplay } from "@/lib/domain/mezzo-attrezzatura/intervento-oggetto-display";
import { formatClientPortalAttrezzatura } from "@/lib/lavorazioni/client-portal-attrezzatura-format";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type LavorazioneEntityClassification = "TELAIO" | "ATTREZZATURA" | "COMPOSITO";

export type LavorazionePortalDisplay = {
  targetType: InterventoTargetType;
  classification: LavorazioneEntityClassification;
  oggettoLabel: string;
  oggettoBadge: string;
  attrezzaturaLine: string;
  telaioLine: string;
  ident: { targa: string; matricola: string; nScuderia: string };
  cliente: string;
  cantiere: string;
  utilizzatore: string;
};

function dash(v: string | null | undefined): string {
  const t = v?.trim();
  return t && t !== "—" ? t : "—";
}

function joinMarcaModello(marca?: string | null, modello?: string | null): string {
  return formatClientPortalAttrezzatura({ marca, modello });
}

function resolveClassification(
  targetType: InterventoTargetType,
  attrezzatureCountOnMezzo?: number,
): LavorazioneEntityClassification {
  if (targetType === "telaio") return "TELAIO";
  if (typeof attrezzatureCountOnMezzo === "number" && attrezzatureCountOnMezzo > 1) return "COMPOSITO";
  return "ATTREZZATURA";
}

function classificationBadge(classification: LavorazioneEntityClassification, oggettoBadge: string): string {
  if (classification === "COMPOSITO") return "COMPOSITO";
  return oggettoBadge;
}

/** SSOT portale clienti — richiede `row.mezzo` post-`enrichLavorazioniListRowsWithAttrezzature`. */
export function resolveLavorazioneContextWithAttrezzatura(
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
  options?: { attrezzatureCountOnMezzo?: number },
): LavorazionePortalDisplay {
  const ctx = composeInterventoContextFromListRow(row, schedeStore);
  const oggetto = resolveInterventoOggettoDisplay(ctx);
  const display = resolveInterventoDisplay(ctx);
  const identRaw = resolveInterventoIdent(ctx);
  const targetType = ctx.target.targetType;

  const telaioLine = joinMarcaModello(display.marcaTelaio.value, display.modelloTelaio.value);
  const attrezzaturaLine =
    targetType === "attrezzatura"
      ? joinMarcaModello(display.marcaAttrezzatura.value, display.modelloAttrezzatura.value)
      : "—";
  const classification = resolveClassification(targetType, options?.attrezzatureCountOnMezzo);

  let oggettoLabel = oggetto.label.trim() || "—";
  if (targetType === "telaio") {
    if (telaioLine !== "—") oggettoLabel = telaioLine;
  } else if (attrezzaturaLine !== "—") {
    oggettoLabel = attrezzaturaLine;
  }

  return {
    targetType,
    classification,
    oggettoLabel,
    oggettoBadge: classificationBadge(classification, oggetto.badge),
    attrezzaturaLine,
    telaioLine,
    ident: {
      targa: dash(identRaw.targa),
      matricola: dash(identRaw.matricola),
      nScuderia: dash(identRaw.nScuderia),
    },
    cliente: dash(interventoClienteLabel(display)),
    cantiere: dash(display.cantiere.value),
    utilizzatore: dash(display.utilizzatore.value),
  };
}
