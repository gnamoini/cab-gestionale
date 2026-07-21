import { ORDINI_FORNITORI_RIGHE_COLUMNS } from "@/lib/db/table-select-columns";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { OrdineFornitoreRow, OrdineFornitoreRigaRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export type OrdineFornitoreRigaPerRicambio = {
  rigaId: string;
  ordineId: string;
  quantita: number;
  numero: string;
  status: string;
  dataOrdine: string;
  fornitoreLabel: string;
};

type OrdineJoin = Pick<OrdineFornitoreRow, "numero" | "status" | "data_ordine" | "fornitore_label">;

function resolveOrdineJoin(raw: OrdineJoin | OrdineJoin[] | null | undefined): OrdineJoin | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

export async function fetchOrdiniFornitoriRigheByRicambioId(
  ricambioId: string,
): Promise<ServiceResult<OrdineFornitoreRigaPerRicambio[]>> {
  try {
    const c = await getBrowserSupabase();
    const { data, error } = await c
      .from("ordini_fornitori_righe")
      .select(`${ORDINI_FORNITORI_RIGHE_COLUMNS}, ordini_fornitori(numero, status, data_ordine, fornitore_label)`)
      .eq("ricambio_id", ricambioId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return err(error.message);
    const out: OrdineFornitoreRigaPerRicambio[] = [];
    for (const row of data ?? []) {
      const r = row as OrdineFornitoreRigaRow & { ordini_fornitori?: OrdineJoin | OrdineJoin[] | null };
      const ord = resolveOrdineJoin(r.ordini_fornitori);
      if (!ord) continue;
      out.push({
        rigaId: row.id,
        ordineId: row.ordine_id,
        quantita: Number(row.quantita) || 0,
        numero: String(ord.numero ?? "—"),
        status: String(ord.status ?? ""),
        dataOrdine: String(ord.data_ordine ?? ""),
        fornitoreLabel: String(ord.fornitore_label ?? ""),
      });
    }
    return success(out);
  } catch (e) {
    return serviceFailFromError(e);
  }
}
