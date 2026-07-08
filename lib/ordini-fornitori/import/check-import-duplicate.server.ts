import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePreventivoNumeroForDedup } from "@/lib/ordini-fornitori/import/format-riferimento-ordine";
import type { ImportDuplicateCheck, ImportDuplicateHit } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";

export function buildImportSemanticKey(input: {
  partitaIva?: string;
  numeroPreventivo?: string;
  dataPreventivo?: string;
}): string | null {
  const piva = (input.partitaIva ?? "").replace(/\D/g, "");
  const numero = normalizePreventivoNumeroForDedup(input.numeroPreventivo ?? "");
  const data = (input.dataPreventivo ?? "").trim().slice(0, 10);
  if (!piva || !numero || !data) return null;
  return createHash("sha256").update(`${piva}|${numero}|${data}`).digest("hex");
}

async function loadDuplicateHit(
  sb: SupabaseClient,
  ordineId: string,
): Promise<ImportDuplicateHit | null> {
  const { data } = await sb
    .from("ordini_fornitori")
    .select("id, numero, fornitore_label")
    .eq("id", ordineId)
    .maybeSingle();
  if (!data?.id) return null;
  return {
    ordineId: data.id,
    ordineNumero: data.numero,
    fornitoreLabel: data.fornitore_label,
  };
}

export async function checkImportDuplicates(
  sb: SupabaseClient,
  input: {
    contentHash: string;
    semanticKey?: string | null;
  },
): Promise<ImportDuplicateCheck> {
  let hashDuplicate: ImportDuplicateHit | null = null;
  let semanticDuplicate: ImportDuplicateHit | null = null;

  const hash = input.contentHash.trim();
  if (hash) {
    const { data: hashRow } = await sb
      .from("ordini_fornitori_import_log")
      .select("ordine_id")
      .eq("content_hash", hash)
      .not("ordine_id", "is", null)
      .maybeSingle();
    if (hashRow?.ordine_id) {
      hashDuplicate = await loadDuplicateHit(sb, hashRow.ordine_id);
    }
  }

  const semanticKey = input.semanticKey?.trim();
  if (semanticKey) {
    const { data: semRow } = await sb
      .from("ordini_fornitori_import_log")
      .select("ordine_id")
      .eq("semantic_key", semanticKey)
      .not("ordine_id", "is", null)
      .maybeSingle();
    if (semRow?.ordine_id) {
      semanticDuplicate = await loadDuplicateHit(sb, semRow.ordine_id);
    }
  }

  return { hashDuplicate, semanticDuplicate };
}
