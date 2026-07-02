import { documentoMatchesMarcaModello } from "@/lib/documenti/documenti-match";
import { documentoRowToGestionale, mezzoGestitoFromRow } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { documentiService } from "@/src/services/documenti.service";
import { mezziService } from "@/src/services/mezzi.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { DocumentoRow, MezzoRow } from "@/src/types/supabase-tables";

export type LavorazioneDocumentiSliceOpts = {
  /** Mezzo già in cache (lista/hub) — embed arricchito con attrezzatura. */
  mezzoHint?: MezzoRow | null;
  attrezzaturaId?: string | null;
};

async function resolveMezzoGestitoForDocumenti(
  mezzoId: string,
  opts?: LavorazioneDocumentiSliceOpts,
): Promise<ServiceResult<ReturnType<typeof mezzoGestitoFromRow>>> {
  const hint = opts?.mezzoHint;
  const hintMarca = hint?.marca?.trim();
  if (hint && hintMarca && hintMarca !== "—") {
    return success(
      mezzoGestitoFromRow(hint, { attrezzaturaId: opts?.attrezzaturaId }),
    );
  }
  const gestitoRes = await mezziService.getGestitoById(mezzoId);
  if (!gestitoRes.success || !gestitoRes.data) {
    return err(gestitoRes.error ?? "Mezzo non trovato");
  }
  return success(gestitoRes.data);
}

/**
 * Documenti compatibili marca/modello per lavorazione.
 */
export async function fetchLavorazioneDocumentiSlice(
  mezzoId: string,
  opts?: LavorazioneDocumentiSliceOpts,
): Promise<ServiceResult<DocumentoRow[]>> {
  const id = mezzoId.trim();
  if (!id) return success([]);

  const mezzoRes = await resolveMezzoGestitoForDocumenti(id, opts);
  if (!mezzoRes.success || !mezzoRes.data) return err(mezzoRes.error ?? "Mezzo non trovato");
  const mezzoG = mezzoRes.data;
  const marca = mezzoG.marca.trim();
  if (!marca || marca === "—") return success([]);

  const docRes = await documentiService.getAll({ marca });
  if (!docRes.success) return docRes;
  const filtered = (docRes.data ?? []).filter((row) =>
    documentoMatchesMarcaModello(documentoRowToGestionale(row), mezzoG.marca, mezzoG.modello),
  );
  return success(filtered);
}
