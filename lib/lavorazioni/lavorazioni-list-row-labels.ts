import {
  composeInterventoContextFromListRow,
  interventoClienteLabel,
  interventoMacchinaLabel,
  interventoMezzoIdentLabel,
  resolveInterventoDisplay,
  resolveInterventoIdent,
} from "@/lib/domain/intervento-context";
import { schedaIngressoFieldsFromDisplay } from "@/lib/domain/intervento-context/resolve-intervento-display-for-surface";
import { countSchedePresenti } from "@/lib/schede/schede-ui";
import { latestAddettoFromLogs } from "@/lib/lavorazioni/client-portal-ui";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
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
  const ctx = composeInterventoContextFromListRow(row, schedeStore);
  const fromIngresso = ctx.schedaIngresso.campi?.addettoAccettazione?.trim();
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

export function lavorazioneSchedeCount(bundle: LavorazioneSchedeBundle | undefined, row: LavorazioneListRow): number {
  return countSchedePresenti(bundle ?? getOrCreateBundle({}, row.id));
}

/** Fingerprint per memo UI — rileva modifiche contenuto bundle (non solo reference). */
export function lavorazioneSchedeBundleRevision(bundle: LavorazioneSchedeBundle | undefined): string {
  return bundle ? JSON.stringify(bundle) : "";
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

export function lavorazioneTelaioLabel(row: LavorazioneListRow, schedeStore: LavorazioneSchedeStore): string {
  const ctx = composeInterventoContextFromListRow(row, schedeStore);
  const display = resolveInterventoDisplay(ctx);
  const fields = schedaIngressoFieldsFromDisplay(display, ctx.schedaIngresso.campi ?? undefined);
  const parts = [fields.tipoTelaio, fields.marcaTelaio, fields.modelloTelaio].map((s) => s?.trim()).filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}
