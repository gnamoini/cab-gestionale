import { documentoMatchesMarcaModello } from "@/lib/documenti/documenti-match";
import { documentoRowToGestionale, toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { documentiService } from "@/src/services/documenti.service";
import { mezziService } from "@/src/services/mezzi.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { DocumentoRow, MezzoRow } from "@/src/types/supabase-tables";

export type LavorazioneDocumentiSliceOpts = {
  /** Mezzo già in cache (lista/hub) — abilita fetch documenti in parallelo al getById. */
  mezzoHint?: MezzoRow | null;
};

/**
 * Documenti compatibili marca/modello per lavorazione.
 * Con `mezzoHint` (marca nota): `getById` ∥ `getAll(marca)` → −1 RTT vs catena sequenziale.
 */
export async function fetchLavorazioneDocumentiSlice(
  mezzoId: string,
  opts?: LavorazioneDocumentiSliceOpts,
): Promise<ServiceResult<DocumentoRow[]>> {
  const id = mezzoId.trim();
  if (!id) return success([]);

  const hint = opts?.mezzoHint;
  const hintMarca = hint?.marca?.trim() ?? "";

  if (hint && hintMarca) {
    const mezzoG = toMezzoUI(hint);
    const [mezzoRes, docRes] = await Promise.all([
      mezziService.getById(id),
      documentiService.getAll({ marca: hintMarca }),
    ]);
    if (!mezzoRes.success || !mezzoRes.data) return err(mezzoRes.error ?? "Mezzo non trovato");
    if (!docRes.success) return docRes;
    const filtered = (docRes.data ?? []).filter((row) =>
      documentoMatchesMarcaModello(documentoRowToGestionale(row), mezzoG.marca, mezzoG.modello),
    );
    return success(filtered);
  }

  const mezzoRes = await mezziService.getById(id);
  if (!mezzoRes.success || !mezzoRes.data) return err(mezzoRes.error ?? "Mezzo non trovato");
  const mezzoG = toMezzoUI(mezzoRes.data);
  const marca = mezzoG.marca.trim();
  if (!marca) return success([]);
  const res = await documentiService.getAll({ marca });
  if (!res.success) return res;
  const filtered = (res.data ?? []).filter((row) =>
    documentoMatchesMarcaModello(documentoRowToGestionale(row), mezzoG.marca, mezzoG.modello),
  );
  return success(filtered);
}
