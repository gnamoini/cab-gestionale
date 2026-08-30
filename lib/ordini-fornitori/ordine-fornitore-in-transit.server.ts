import "server-only";

import { ORDINI_FORNITORI_RIGHE_COLUMNS } from "@/lib/db/table-select-columns";
import {
  aggregateInTransitByRicambioId,
  type OrdineFornitoreInTransitDetailRow,
} from "@/lib/ordini-fornitori/ordine-fornitore-in-transit";
import { normalizeOrdineFornitoreStatus } from "@/lib/ordini-fornitori/ordine-fornitore-status-transitions";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { OrdineFornitoreRow, OrdineFornitoreRigaRow } from "@/src/types/supabase-tables";

type InTransitJoinRow = OrdineFornitoreRigaRow & {
  ordini_fornitori: Pick<OrdineFornitoreRow, "numero" | "status"> | Pick<OrdineFornitoreRow, "numero" | "status">[] | null;
};

function resolveOrdineJoin(
  raw: InTransitJoinRow["ordini_fornitori"],
): Pick<OrdineFornitoreRow, "numero" | "status"> | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

export async function fetchInTransitMapServer(
  ricambioIds?: string[],
): Promise<ServiceResult<Record<string, number>>> {
  if (!(await verifyServerModuleCan("ordini_fornitori", "read"))) {
    return err("Permesso richiesto.");
  }
  const sb = await createSupabaseServerUserClient();
  let q = sb
    .from("ordini_fornitori_righe")
    .select(`${ORDINI_FORNITORI_RIGHE_COLUMNS}, ordini_fornitori!inner(numero, status)`)
    .eq("ordini_fornitori.status", "in_consegna");

  if (ricambioIds && ricambioIds.length > 0) {
    q = q.in("ricambio_id", ricambioIds);
  } else {
    q = q.not("ricambio_id", "is", null);
  }

  const { data, error } = await q;
  if (error) return err(error.message);

  const aggRows: { ricambioId: string; qtyInTransit: number }[] = [];
  for (const row of (data ?? []) as InTransitJoinRow[]) {
    const ricambioId = row.ricambio_id;
    if (!ricambioId) continue;
    const qty = Number(row.quantita) - Number(row.quantita_ricevuta ?? 0);
    if (qty <= 0) continue;
    aggRows.push({ ricambioId, qtyInTransit: qty });
  }

  return success(aggregateInTransitByRicambioId(aggRows));
}

export async function fetchInTransitDetailForRicambioServer(
  ricambioId: string,
): Promise<ServiceResult<OrdineFornitoreInTransitDetailRow[]>> {
  if (!(await verifyServerModuleCan("ordini_fornitori", "read"))) {
    return err("Permesso richiesto.");
  }
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("ordini_fornitori_righe")
    .select(`${ORDINI_FORNITORI_RIGHE_COLUMNS}, ordini_fornitori!inner(id, numero, status)`)
    .eq("ricambio_id", ricambioId)
    .eq("ordini_fornitori.status", "in_consegna");

  if (error) return err(error.message);

  const out: OrdineFornitoreInTransitDetailRow[] = [];
  for (const row of (data ?? []) as InTransitJoinRow[]) {
    const ord = resolveOrdineJoin(row.ordini_fornitori);
    if (!ord) continue;
    const qtyInTransit = Number(row.quantita) - Number(row.quantita_ricevuta ?? 0);
    if (qtyInTransit <= 0) continue;
    out.push({
      ordineId: row.ordine_id,
      rigaId: row.id,
      numero: String(ord.numero ?? "—"),
      status: normalizeOrdineFornitoreStatus(String(ord.status)),
      qtyInTransit,
    });
  }

  out.sort((a, b) => a.numero.localeCompare(b.numero, "it"));
  return success(out);
}
