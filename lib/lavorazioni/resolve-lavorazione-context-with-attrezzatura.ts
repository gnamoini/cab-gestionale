import { composeInterventoContextFromListRow } from "@/lib/domain/intervento-context/build-intervento-context";
import {
  interventoClienteLabel,
  resolveInterventoDisplay,
  resolveInterventoIdent,
} from "@/lib/domain/intervento-context";
import type { InterventoTargetType } from "@/lib/domain/mezzo-attrezzatura/intervento-target";
import { resolveInterventoOggettoDisplay } from "@/lib/domain/mezzo-attrezzatura/intervento-oggetto-display";
import { formatClientPortalAttrezzatura } from "@/lib/lavorazioni/client-portal-attrezzatura-format";
import { mezzoGestitoFromRow } from "@/lib/domain/mezzo-attrezzatura/compose-mezzo-gestito";
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

function resolveTelaioLine(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const ingresso = schedeStore?.[row.id]?.ingresso?.campi;
  if (ingresso) {
    const fromIngresso = joinMarcaModello(ingresso.marcaTelaio, ingresso.modelloTelaio);
    if (fromIngresso !== "—") return fromIngresso;
  }
  const m = row.mezzo;
  if (m) {
    const fromEmbed = joinMarcaModello(m.marca_telaio, m.modello_telaio);
    if (fromEmbed !== "—") return fromEmbed;
    const gestito = mezzoGestitoFromRow(m, { attrezzaturaId: row.attrezzatura_id });
    const fromGestito = joinMarcaModello(gestito.marcaTelaio, gestito.modelloTelaio);
    if (fromGestito !== "—") return fromGestito;
  }
  return "—";
}

function resolveAttrezzaturaLine(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore | undefined,
  targetType: InterventoTargetType,
): string {
  if (targetType !== "attrezzatura") return "—";
  const ingresso = schedeStore?.[row.id]?.ingresso?.campi;
  if (ingresso) {
    const fromIngresso = joinMarcaModello(ingresso.marcaAttrezzatura, ingresso.modelloAttrezzatura);
    if (fromIngresso !== "—") return fromIngresso;
  }
  const ctx = composeInterventoContextFromListRow(row, schedeStore);
  const att = ctx.target.attrezzatura;
  return joinMarcaModello(att.marca, att.modello);
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

  const telaioLine = resolveTelaioLine(row, schedeStore);
  const attrezzaturaLine = resolveAttrezzaturaLine(row, schedeStore, targetType);
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
