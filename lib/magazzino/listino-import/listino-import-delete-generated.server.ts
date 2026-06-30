import "server-only";

import { readListinoImportFromRicambioMeta } from "@/lib/magazzino/listino-import/listino-import-meta";
import type { ListinoImportDeleteGeneratedResult } from "@/lib/magazzino/listino-import/listino-import-types";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function deleteGeneratedListinoRicambi(): Promise<ListinoImportDeleteGeneratedResult> {
  const sb = await createSupabaseServerUserClient();
  const { data: rows, error } = await sb.from("magazzino_ricambi").select("id, codice, meta");
  if (error) throw new Error(error.message);

  const generatedIds: Array<{ id: string; codice: string }> = [];
  for (const row of rows ?? []) {
    const r = row as { id: string; codice: string; meta?: unknown };
    if (readListinoImportFromRicambioMeta(r.meta)) {
      generatedIds.push({ id: r.id, codice: r.codice });
    }
  }

  if (!generatedIds.length) {
    return { deleted: 0, blocked: [] };
  }

  const ids = generatedIds.map((r) => r.id);
  const { data: movimenti, error: movErr } = await sb
    .from("movimenti_ricambi")
    .select("ricambio_id")
    .in("ricambio_id", ids);
  if (movErr) throw new Error(movErr.message);

  const blockedIds = new Set((movimenti ?? []).map((m) => String((m as { ricambio_id: string }).ricambio_id)));
  const deletable = generatedIds.filter((r) => !blockedIds.has(r.id));
  const blocked = generatedIds
    .filter((r) => blockedIds.has(r.id))
    .map((r) => ({ id: r.id, codice: r.codice, reason: "Movimenti di magazzino collegati" }));

  if (deletable.length) {
    const { error: delErr } = await sb
      .from("magazzino_ricambi")
      .delete()
      .in(
        "id",
        deletable.map((r) => r.id),
      );
    if (delErr) throw new Error(delErr.message);
  }

  return { deleted: deletable.length, blocked };
}
