import "server-only";

import { readListinoImportFromRicambioMeta } from "@/lib/magazzino/listino-import/listino-import-meta";
import type { ListinoImportDeleteGeneratedResult } from "@/lib/magazzino/listino-import/listino-import-types";
import { LISTINO_IMPORT_DELETE_IN_CHUNK } from "@/lib/magazzino/listino-import/listino-import-types";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { SupabaseClient } from "@supabase/supabase-js";

type GeneratedRicambioRow = { id: string; codice: string };

function chunkIds<T>(ids: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}

export async function fetchGeneratedListinoRicambi(
  sb: SupabaseClient,
): Promise<GeneratedRicambioRow[]> {
  const { data, error } = await sb
    .from("magazzino_ricambi")
    .select("id, codice, meta")
    .filter("meta->listinoImport->>generatoAutomaticamente", "eq", "true");
  if (error) throw new Error(error.message);

  const rows: GeneratedRicambioRow[] = [];
  for (const row of data ?? []) {
    const r = row as { id: string; codice: string; meta?: unknown };
    if (!readListinoImportFromRicambioMeta(r.meta)) continue;
    rows.push({ id: r.id, codice: r.codice });
  }
  return rows;
}

export async function fetchRicambioIdsWithMovimenti(
  sb: SupabaseClient,
  ricambioIds: readonly string[],
): Promise<Set<string>> {
  const blocked = new Set<string>();
  for (const chunk of chunkIds(ricambioIds, LISTINO_IMPORT_DELETE_IN_CHUNK)) {
    const { data, error } = await sb.from("movimenti_ricambi").select("ricambio_id").in("ricambio_id", chunk);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      blocked.add(String((row as { ricambio_id: string }).ricambio_id));
    }
  }
  return blocked;
}

async function deleteRicambiChunks(sb: SupabaseClient, ids: readonly string[]): Promise<number> {
  let deleted = 0;
  for (const chunk of chunkIds(ids, LISTINO_IMPORT_DELETE_IN_CHUNK)) {
    const { error, count } = await sb
      .from("magazzino_ricambi")
      .delete({ count: "exact" })
      .in("id", chunk);
    if (error) throw new Error(error.message);
    deleted += count ?? chunk.length;
  }
  return deleted;
}

export async function deleteGeneratedListinoRicambi(): Promise<ListinoImportDeleteGeneratedResult> {
  const sb = await createSupabaseServerUserClient();
  const generatedIds = await fetchGeneratedListinoRicambi(sb);

  if (!generatedIds.length) {
    return { deleted: 0, blocked: [] };
  }

  const ids = generatedIds.map((r) => r.id);
  const blockedIds = await fetchRicambioIdsWithMovimenti(sb, ids);
  const deletable = generatedIds.filter((r) => !blockedIds.has(r.id));
  const blocked = generatedIds
    .filter((r) => blockedIds.has(r.id))
    .map((r) => ({ id: r.id, codice: r.codice, reason: "Movimenti di magazzino collegati" }));

  const deleted = deletable.length ? await deleteRicambiChunks(sb, deletable.map((r) => r.id)) : 0;

  return { deleted, blocked };
}
