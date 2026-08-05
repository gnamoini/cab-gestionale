import "server-only";

import {
  DOCUMENTI_COLUMNS,
  LOG_MODIFICHE_WITH_PROFILE_SELECT,
  LAVORAZIONI_LIST_LIGHT_COLUMNS,
  MEZZI_LIST_LIGHT_COLUMNS,
  MOVIMENTI_RICAMBI_COLUMNS,
  PREVENTIVI_COLUMNS,
} from "@/lib/db/table-select-columns";
import { mapLavorazioneLightToListRow } from "@/lib/db/dto-mappers";
import { documentoMatchesMarcaModello } from "@/lib/documenti/documenti-match";
import { documentoRowToGestionale } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { fetchMezzoGestitoById } from "@/lib/mezzi/mezzi-attrezzature-batch";
import { applyLavorazioniNotDeletedFilter } from "@/lib/lavorazioni/lavorazioni-soft-delete";
import { LOG_MODIFICHE_RETENTION_PER_ENTITA } from "@/lib/gestionale-log/log-modifiche-retention";
import {
  mezzoDomainService,
  type MezzoHubData,
  type MezzoQueriesSnapshot,
} from "@/src/services/domain/mezzo-domain.service";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type {
  DocumentoRow,
  LogModificaRow,
  LavorazioneRow,
  MezzoRow,
  MovimentoRicambioRow,
  PreventivoRow,
} from "@/src/types/supabase-tables";

export type MezzoDetailDTO = MezzoHubData;

/**
 * BFF MezzoDetail — wave 1: mezzo + lavorazioni + preventivi + log in parallelo;
 * wave 2: documenti (marca) + movimenti (lav ids) in parallelo.
 */
export async function fetchMezzoDetailDTOServer(mezzoId: string): Promise<ServiceResult<MezzoDetailDTO>> {
  const allowed = await verifyServerPageRead("mezzi");
  if (!allowed) return err("Permesso richiesto.");
  const id = mezzoId.trim();
  if (!id) return err("ID mezzo mancante.");

  const sb = await createSupabaseServerUserClient();
  const lavSelect = LAVORAZIONI_LIST_LIGHT_COLUMNS;

  const [mezzoRes, lavRes, pvRes, logRes] = await Promise.all([
    sb.from("mezzi").select(MEZZI_LIST_LIGHT_COLUMNS).eq("id", id).maybeSingle(),
    applyLavorazioniNotDeletedFilter(sb.from("lavorazioni").select(lavSelect).eq("mezzo_id", id)),
    sb.from("preventivi").select(PREVENTIVI_COLUMNS).eq("mezzo_id", id),
    sb
      .from("log_modifiche")
      .select(LOG_MODIFICHE_WITH_PROFILE_SELECT)
      .eq("entita", "mezzi")
      .eq("entita_id", id)
      .order("created_at", { ascending: false })
      .limit(LOG_MODIFICHE_RETENTION_PER_ENTITA),
  ]);

  if (mezzoRes.error) return err(mezzoRes.error.message);
  if (!mezzoRes.data) return err("Mezzo non trovato");

  const mezzoRow = mezzoRes.data as MezzoRow;
  const mezzoGestito = await fetchMezzoGestitoById(sb, id, mezzoRow);
  if (!mezzoGestito) return err("Mezzo non trovato");
  const marca = mezzoGestito.marca?.trim() ?? "";
  const modello = mezzoGestito.modello?.trim() ?? "";
  const lavRows = (lavRes.data ?? []) as unknown as (LavorazioneRow & { mezzi?: unknown })[];
  const lavorazioni = lavRows.map((r) => mapLavorazioneLightToListRow(r));
  const lavIds = lavorazioni.map((r) => r.id);

  const [docRes, movRes] = await Promise.all([
    marca
      ? sb.from("documenti").select(DOCUMENTI_COLUMNS).eq("marca", marca)
      : Promise.resolve({ data: [] as DocumentoRow[], error: null }),
    lavIds.length > 0
      ? sb.from("movimenti_ricambi").select(MOVIMENTI_RICAMBI_COLUMNS).in("lavorazione_id", lavIds)
      : Promise.resolve({ data: [] as MovimentoRicambioRow[], error: null }),
  ]);

  const documentiRows = ((docRes.data ?? []) as DocumentoRow[]).filter((row) =>
    documentoMatchesMarcaModello(documentoRowToGestionale(row), marca, modello),
  );

  const snapshot: MezzoQueriesSnapshot = {
    mezzoGestito,
    lavorazioni,
    preventiviRows: (pvRes.data ?? []) as PreventivoRow[],
    documentiRows,
    logRows: (logRes.data ?? []) as LogModificaRow[],
    movimentiRows: (movRes.data ?? []) as MovimentoRicambioRow[],
  };

  const hub = mezzoDomainService.composeHubData(snapshot);
  if (!hub) return err("Composizione hub non riuscita.");
  return success(hub);
}
