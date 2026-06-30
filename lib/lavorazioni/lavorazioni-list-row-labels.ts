import {
  composeInterventoContextFromListRow,
  interventoClienteLabel,
  interventoMacchinaLabel,
  interventoMezzoIdentLabel,
  resolveInterventoDisplay,
  resolveInterventoIdent,
} from "@/lib/domain/intervento-context";
import { schedaIngressoFieldsFromDisplay } from "@/lib/domain/intervento-context/resolve-intervento-display-for-surface";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { latestAddettoFromLogs } from "@/lib/lavorazioni/client-portal-ui";
import { countSchedePresenti } from "@/lib/schede/schede-ui";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { InterventoDisplay } from "@/lib/domain/intervento-context/intervento-context.types";
import type { LavorazioneSchedeBundle, LavorazioneSchedeStore } from "@/types/schede";

export function lavorazioneSchedeStoreSlice(
  lavorazioneId: string,
  bundle: LavorazioneSchedeBundle | undefined,
): LavorazioneSchedeStore {
  if (!bundle) return {};
  return { [lavorazioneId]: bundle };
}

function listRowDisplay(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): InterventoDisplay {
  return resolveInterventoDisplay(composeInterventoContextFromListRow(row, schedeStore));
}

export function lavorazioneMacchinaLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return interventoMacchinaLabel(listRowDisplay(row, schedeStore));
}

export function lavorazioneClienteLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return interventoClienteLabel(listRowDisplay(row, schedeStore));
}

export function lavorazioneUtilizzatoreLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return listRowDisplay(row, schedeStore).utilizzatore.value.trim();
}

export function lavorazioneCantiereLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return listRowDisplay(row, schedeStore).cantiere.value.trim() || "—";
}

export function lavorazioneAddettoLabel(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
  fallbackAddetto = "",
  logs?: readonly LogModificaRow[],
): string {
  const fromIngresso =
    schedeStore[row.id]?.ingresso?.campi?.addettoAccettazione?.trim() ||
    composeInterventoContextFromListRow(row, schedeStore).schedaIngresso.campi?.addettoAccettazione?.trim() ||
    "";
  const fromRighe =
    schedeStore[row.id]?.lavorazioni?.campi.righe
      .flatMap((r) => r.addettiAssegnati)
      .find((a) => a.addetto.trim())
      ?.addetto.trim() ?? "";
  const fromLogs = logs?.length ? latestAddettoFromLogs(logs) : "—";
  const label =
    fromIngresso ||
    fromRighe ||
    (fromLogs !== "—" ? fromLogs : "") ||
    fallbackAddetto.trim();
  return label || "—";
}

export function lavorazioneSchedeCount(bundle: LavorazioneSchedeBundle | undefined): number {
  if (!bundle) return 0;
  return countSchedePresenti(bundle);
}

/** Badge lista «N/3» — «…/3» finché il bundle non è in cache. */
export function formatLavorazioneSchedeBadge(bundle: LavorazioneSchedeBundle | undefined): string {
  if (bundle === undefined) return "…/3";
  return `${countSchedePresenti(bundle)}/3`;
}

/** Fingerprint per memo UI — rileva modifiche contenuto bundle (non solo reference). */
export function lavorazioneSchedeBundleRevision(bundle: LavorazioneSchedeBundle | undefined): string {
  if (!bundle) return "";
  return [
    bundle._revision ?? "",
    bundle._fetchedAt ?? "",
    countSchedePresenti(bundle),
    bundle.ingresso?.updatedAt ?? "",
    bundle.lavorazioni?.updatedAt ?? "",
    bundle.ricambi?.updatedAt ?? "",
  ].join("|");
}

export type LavorazioneMezzoIdentParts = { targa: string; matricola: string; scuderia: string };

export function lavorazioneMezzoIdentParts(
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
): LavorazioneMezzoIdentParts {
  const ident = resolveInterventoIdent(composeInterventoContextFromListRow(row, schedeStore));
  return {
    targa: ident.targa.trim(),
    matricola: ident.matricola.trim(),
    scuderia: ident.nScuderia.trim(),
  };
}

export function lavorazioneMezzoIdent(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return interventoMezzoIdentLabel(listRowDisplay(row, schedeStore));
}

function lavorazioneTelaioParts(marca?: string | null, modello?: string | null): string[] {
  return [marca, modello].map((s) => s?.trim()).filter(Boolean) as string[];
}

function lavorazioneTelaioFromParts(_tipo?: string | null, marca?: string | null, modello?: string | null): string {
  const parts = lavorazioneTelaioParts(marca, modello);
  return parts.length ? parts.join(" ") : "—";
}

/** Sottotitolo colonna Attrezzatura in lista: marca e modello telaio (senza tipo). */
export function lavorazioneTelaioLabel(row: LavorazioneListRow, schedeStore: LavorazioneSchedeStore): string {
  const ingresso = schedeStore[row.id]?.ingresso?.campi;
  if (ingresso) {
    const fromIngresso = lavorazioneTelaioFromParts(
      ingresso.tipoTelaio,
      ingresso.marcaTelaio,
      ingresso.modelloTelaio,
    );
    if (fromIngresso !== "—") return fromIngresso;
  }

  const ctx = composeInterventoContextFromListRow(row, schedeStore);
  const display = resolveInterventoDisplay(ctx);
  const fields = schedaIngressoFieldsFromDisplay(display, ctx.schedaIngresso.campi ?? undefined);
  const fromFields = lavorazioneTelaioFromParts(fields.tipoTelaio, fields.marcaTelaio, fields.modelloTelaio);
  if (fromFields !== "—") return fromFields;

  if (row.mezzo) {
    const mezzo = toMezzoUI(row.mezzo);
    const fromMezzo = lavorazioneTelaioFromParts(mezzo.tipoTelaio, mezzo.marcaTelaio, mezzo.modelloTelaio);
    if (fromMezzo !== "—") return fromMezzo;
  }

  return "—";
}
