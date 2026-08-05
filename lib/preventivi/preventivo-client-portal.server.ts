import "server-only";

import { buildPreventivoAcceptanceStatus } from "@/lib/preventivi/preventivo-acceptance-status.server";
import { isPreventivoVisibleToClient } from "@/lib/preventivi/preventivo-client-visibility";
import { preventivoRowToRecord } from "@/lib/preventivi/preventivi-db-mapper";
import {
  resolvePreventivoStatoCliente,
  resolvePreventivoStatoWorkflow,
} from "@/lib/preventivi/preventivo-row-state";
import { buildClientOfficialDocumentPreviewPath, buildOfficialDocumentTokenStreamPath } from "@/lib/official-documents/preview-url";
import { PREVENTIVI_COLUMNS, PREVENTIVO_EVENTS_COLUMNS } from "@/lib/db/table-select-columns";
import { fetchEnrichedLavorazioneListRow } from "@/lib/lavorazioni/fetch-enriched-lavorazione-row";
import { sanitizeClientLavorazioneRow } from "@/lib/lavorazioni/client-portal-stati";
import { resolveLavorazioniStatiForServer } from "@/lib/app-settings/resolve-settings-for-server";
import { verifyClientLavorazioniAccessServer } from "@/src/lib/auth/client-lavorazioni-access-server";
import { lavorazioneMatchesClienteScope } from "@/src/lib/auth/cliente-portal-scope";
import { loadServerCallerClienteRef } from "@/src/lib/auth/cliente-portal-scope.server";
import { resolveRole } from "@/lib/auth/rbac";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { PreventivoEventRow, PreventivoRow } from "@/src/types/supabase-tables";

const CLIENT_VISIBLE_EVENTS = new Set([
  "sent",
  "viewed",
  "accepted_client",
  "rejected_client",
  "accepted_timeout",
]);

const EVENT_LABELS: Record<string, string> = {
  sent: "Preventivo inviato",
  viewed: "Visualizzato",
  accepted_client: "Accettato",
  rejected_client: "Rifiutato",
  accepted_timeout: "Accettato automaticamente",
};

import type {
  ClientPreventivoPortalPayload,
  ClientPreventivoTimelineEntry,
} from "@/lib/preventivi/preventivo-client-portal-types";

function eventLabel(event: PreventivoEventRow): string {
  if (event.event_type === "accepted_timeout") {
    return "Accettato automaticamente per mancata risposta entro 24 ore";
  }
  return EVENT_LABELS[event.event_type] ?? event.event_type;
}

async function fetchActivePreventivoForLavorazione(
  sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>,
  lavorazioneId: string,
): Promise<PreventivoRow | null> {
  const { data, error } = await sb
    .from("preventivi")
    .select(PREVENTIVI_COLUMNS)
    .eq("lavorazione_id", lavorazioneId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as PreventivoRow[];
  return (
    rows.find((r) =>
      isPreventivoVisibleToClient(
        resolvePreventivoStatoWorkflow(r),
        resolvePreventivoStatoCliente(r),
        r.inviato_at,
      ),
    ) ?? null
  );
}

export async function fetchClientPreventivoPortalServer(
  lavorazioneId: string,
  options?: { markViewed?: boolean },
): Promise<ServiceResult<ClientPreventivoPortalPayload>> {
  const allowed = await verifyClientLavorazioniAccessServer();
  if (!allowed) return err("Permesso richiesto.");

  const id = lavorazioneId.trim();
  if (!id) return err("Lavorazione non valida.");

  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return err("Permesso richiesto.");

  const enriched = await fetchEnrichedLavorazioneListRow(sb, id);
  if (!enriched) return err("Lavorazione non trovata.");

  const settingsStati = await resolveLavorazioniStatiForServer();
  const lavRow = sanitizeClientLavorazioneRow(enriched, settingsStati);

  const { data: prof } = await sb.from("profiles").select("role_key").eq("id", user.id).maybeSingle();
  const role = resolveRole(prof?.role_key);
  const clienteRef = await loadServerCallerClienteRef(sb);
  if (
    !lavorazioneMatchesClienteScope(lavRow, clienteRef, {
      failClosedForClienteRole: true,
      role,
    })
  ) {
    return err("Lavorazione non trovata.");
  }

  let row = await fetchActivePreventivoForLavorazione(sb, id);
  if (!row) return err("Nessun preventivo disponibile.");

  if (options?.markViewed) {
    const { data: viewedRow, error: viewErr } = await sb.rpc("mark_preventivo_viewed_by_client", {
      p_preventivo_id: row.id,
    });
    if (!viewErr && viewedRow) row = viewedRow as PreventivoRow;
  }

  const { data: tokenRow } = await sb
    .from("document_access_tokens")
    .select("token")
    .eq("entity_type", "preventivo")
    .eq("entity_id", row.id)
    .is("revoked_at", null)
    .maybeSingle();

  const { data: events } = await sb
    .from("preventivo_events")
    .select(PREVENTIVO_EVENTS_COLUMNS)
    .eq("preventivo_id", row.id)
    .order("created_at", { ascending: true });

  const timeline = ((events ?? []) as PreventivoEventRow[])
    .filter((e) => CLIENT_VISIBLE_EVENTS.has(e.event_type))
    .map((e) => ({
      at: e.created_at,
      label: eventLabel(e),
      eventType: e.event_type,
    }));

  const det = (row.dettagli ?? {}) as Record<string, unknown>;
  const numero = typeof det.numero === "string" ? det.numero.trim() : row.id.slice(0, 8);
  const token = typeof tokenRow?.token === "string" ? tokenRow.token : "";

  return success({
    preventivoId: row.id,
    numero,
    versione: row.versione ?? 1,
    totale: row.totale,
    inviatoAt: row.inviato_at,
    acceptanceStatus: buildPreventivoAcceptanceStatus(row),
    timeline,
    streamPath: token ? buildOfficialDocumentTokenStreamPath(token) : "",
    previewPath: token ? buildClientOfficialDocumentPreviewPath(token) : "",
    descrizioneCliente:
      typeof det.descrizioneLavorazioniCliente === "string" ? det.descrizioneLavorazioniCliente : "",
    righeCount: Array.isArray(det.righeRicambi) ? det.righeRicambi.length : 0,
  });
}

export async function respondClientPreventivoServer(input: {
  lavorazioneId: string;
  action: "accept" | "reject";
  motivazione?: string;
}): Promise<ServiceResult<PreventivoRow>> {
  const allowed = await verifyClientLavorazioniAccessServer();
  if (!allowed) return err("Permesso richiesto.");

  const portal = await fetchClientPreventivoPortalServer(input.lavorazioneId, { markViewed: false });
  if (!portal.success || !portal.data) return err(portal.error ?? "Preventivo non disponibile.");

  if (!portal.data.acceptanceStatus.canRespond) {
    return err("Non è possibile rispondere a questo preventivo.");
  }

  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("commit_preventivo_client_response", {
    p_preventivo_id: portal.data.preventivoId,
    p_action: input.action,
    p_motivazione: input.motivazione?.trim() || null,
  });

  if (error) return err(error.message);
  if (!data) return err("Operazione non riuscita.");
  return success(data as PreventivoRow);
}

/** Dettagli economici cliente (no costi interni). */
export function buildClientPreventivoEconomics(record: ReturnType<typeof preventivoRowToRecord>) {
  return {
    totaleRicambi: record.totaleRicambi,
    totaleManodopera: record.totaleManodopera,
    totaleFinale: record.totaleFinale,
    righeRicambi: record.righeRicambi.map((r) => ({
      descrizione: r.descrizione,
      quantita: r.quantita,
      prezzoUnitario: r.prezzoUnitario,
      scontoPercent: r.scontoPercent,
    })),
  };
}
