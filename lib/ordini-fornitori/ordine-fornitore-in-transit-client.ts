import type { OrdineFornitoreInTransitDetailRow } from "@/lib/ordini-fornitori/ordine-fornitore-in-transit";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export async function fetchOrdineFornitoreInTransitMapClient(
  ricambioIds?: string[],
): Promise<ServiceResult<Record<string, number>>> {
  try {
    const qs =
      ricambioIds && ricambioIds.length > 0
        ? `?ricambio_ids=${encodeURIComponent(ricambioIds.join(","))}`
        : "";
    const res = await fetch(`/api/ordini-fornitori/in-transit${qs}`);
    const json = await res.json();
    if (!res.ok) return err(json.error ?? "Errore qty in consegna.");
    return success((json.byRicambio as Record<string, number>) ?? {});
  } catch (e) {
    return serviceFailFromError(e);
  }
}

export async function fetchOrdineFornitoreInTransitDetailClient(
  ricambioId: string,
): Promise<ServiceResult<OrdineFornitoreInTransitDetailRow[]>> {
  try {
    const res = await fetch(`/api/ordini-fornitori/in-transit/${encodeURIComponent(ricambioId)}`);
    const json = await res.json();
    if (!res.ok) return err(json.error ?? "Errore dettaglio in consegna.");
    return success((json.rows as OrdineFornitoreInTransitDetailRow[]) ?? []);
  } catch (e) {
    return serviceFailFromError(e);
  }
}
