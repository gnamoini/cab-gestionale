import "server-only";

import {
  DOCUMENTI_COLUMNS,
  LAVORAZIONI_DETAIL_COLUMNS,
  LOG_MODIFICHE_COLUMNS,
  MOVIMENTI_RICAMBI_COLUMNS,
  PREVENTIVI_COLUMNS,
  SCHEDA_LAVORAZIONE_COLUMNS,
  MEZZI_LIST_LIGHT_COLUMNS,
} from "@/lib/db/table-select-columns";
import { documentoMatchesMarcaModello } from "@/lib/documenti/documenti-match";
import { documentoRowToGestionale } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { applyLavorazioniNotDeletedFilter } from "@/lib/lavorazioni/lavorazioni-soft-delete";
import { LOG_MODIFICHE_RETENTION_PER_ENTITA } from "@/lib/gestionale-log/log-modifiche-retention";
import {
  lavorazioniDomainService,
  type LavorazioneHubData,
  type LavorazioneQueriesSnapshot,
} from "@/src/services/domain/lavorazioni-domain.service";
import { verifyServerSectionRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type {
  DocumentoRow,
  LavorazioneRow,
  LogModificaRow,
  MovimentoRicambioRow,
  PreventivoRow,
  SchedaLavorazioneRow,
} from "@/src/types/supabase-tables";

export type LavorazioneDetailDTO = LavorazioneHubData;

async function fetchDocumentiForMezzoMarca(
  sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>,
  marca: string,
  modello: string,
): Promise<DocumentoRow[]> {
  const m = marca.trim();
  if (!m) return [];
  const { data, error } = await sb.from("documenti").select(DOCUMENTI_COLUMNS).eq("marca", m);
  if (error) return [];
  return (data ?? []).filter((row) =>
    documentoMatchesMarcaModello(documentoRowToGestionale(row as DocumentoRow), marca, modello),
  ) as DocumentoRow[];
}

/**
 * BFF LavorazioneDetail — composizione server-side in 2 wave:
 * Wave 1: 5 query parallele (lav+mezzo embed, schede, movimenti, preventivi, log)
 * Wave 2: documenti (marca da embed mezzo) — 1 query
 */
export async function fetchLavorazioneDetailDTOServer(
  lavorazioneId: string,
): Promise<ServiceResult<LavorazioneDetailDTO>> {
  const allowed = await verifyServerSectionRead("lavorazioni");
  if (!allowed) return err("Permesso richiesto.");
  const id = lavorazioneId.trim();
  if (!id) return err("ID lavorazione mancante.");

  const sb = await createSupabaseServerUserClient();

  const lavSelect = `${LAVORAZIONI_DETAIL_COLUMNS}, mezzi(${MEZZI_LIST_LIGHT_COLUMNS})`;

  const [lavRes, schedeRes, movRes, pvRes, logRes] = await Promise.all([
    applyLavorazioniNotDeletedFilter(sb.from("lavorazioni").select(lavSelect).eq("id", id)).maybeSingle(),
    sb.from("scheda_lavorazione").select(SCHEDA_LAVORAZIONE_COLUMNS).eq("lavorazione_id", id),
    sb.from("movimenti_ricambi").select(MOVIMENTI_RICAMBI_COLUMNS).eq("lavorazione_id", id),
    sb.from("preventivi").select(PREVENTIVI_COLUMNS).eq("lavorazione_id", id),
    sb
      .from("log_modifiche")
      .select(LOG_MODIFICHE_COLUMNS)
      .eq("entita", "lavorazioni")
      .eq("entita_id", id)
      .order("created_at", { ascending: false })
      .limit(LOG_MODIFICHE_RETENTION_PER_ENTITA),
  ]);

  if (lavRes.error) return err(lavRes.error.message);
  if (!lavRes.data) return err("Lavorazione non trovata");

  const lavRow = lavRes.data as unknown as LavorazioneRow & {
    mezzi?: { marca?: string; modello?: string } | null;
  };
  const mezzoEmbed = lavRow.mezzi;
  const marca = mezzoEmbed?.marca?.trim() ?? "";
  const modello = mezzoEmbed?.modello?.trim() ?? "";

  const documentiRows = marca
    ? await fetchDocumentiForMezzoMarca(sb, marca, modello)
    : [];

  const snapshot: LavorazioneQueriesSnapshot = {
    lavorazioneRow: lavRow,
    schedeRows: (schedeRes.data ?? []) as SchedaLavorazioneRow[],
    movimentiRows: (movRes.data ?? []) as MovimentoRicambioRow[],
    preventiviRows: (pvRes.data ?? []) as PreventivoRow[],
    documentiRows,
    logRows: (logRes.data ?? []) as LogModificaRow[],
  };

  const hub = lavorazioniDomainService.composeLavorazioneHub(snapshot);
  if (!hub) return err("Composizione hub non riuscita.");
  return success(hub);
}
