import "server-only";

import type { ImportEntity } from "@/lib/data-import/core/types";
import { getImportPlugin } from "@/lib/data-import/registry";
import { generateStubCsvExport, type ExportFormat } from "@/lib/data-import/core/export-plugin";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function handleExportEntity(entity: ImportEntity, format: ExportFormat): Promise<Buffer> {
  const plugin = getImportPlugin(entity);
  if (!plugin.exportEnabled) {
    throw new Error(`Export non abilitato per ${plugin.label}.`);
  }

  if (entity === "magazzino_ricambi" && format === "csv") {
    const sb = await createSupabaseServerUserClient();
    const { data } = await sb.from("magazzino_ricambi").select("codice, nome, marca, quantita, costo, prezzo_vendita, meta");
    const rows = (data ?? []).map((r) => {
      const meta = (r.meta && typeof r.meta === "object" ? r.meta : {}) as Record<string, unknown>;
      return {
        codice: r.codice,
        descrizione: r.nome,
        marca: r.marca,
        quantita: r.quantita,
        costo: r.costo,
        prezzo_vendita: r.prezzo_vendita,
        categoria: meta.categoria ?? "",
        note: meta.note ?? "",
      };
    });
    return generateStubCsvExport(plugin.fields, rows);
  }

  throw new Error(`Export ${format} non ancora implementato per ${plugin.label}.`);
}
