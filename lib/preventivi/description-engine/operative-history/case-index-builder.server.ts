import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PREVENTIVI_COLUMNS } from "@/lib/db/table-select-columns";
import { normPhrase } from "@/lib/preventivi/preventivi-learning-storage";

export async function upsertOperativeHistoryCaseFromPreventivo(
  supabase: SupabaseClient,
  preventivoId: string,
): Promise<void> {
  const { data: row } = await supabase.from("preventivi").select(PREVENTIVI_COLUMNS).eq("id", preventivoId).maybeSingle();
  if (!row) return;
  const det = (row.dettagli ?? {}) as Record<string, unknown>;
  const tech = String(det.descrizioneLavorazioniTecnicaSorgente ?? "").trim();
  const client = String(det.descrizioneLavorazioniCliente ?? "").trim();
  if (!tech || !client) return;

  const caseKey = createHash("sha256").update(`${preventivoId}:${normPhrase(tech)}`).digest("hex").slice(0, 32);
  const { data: existing } = await supabase
    .from("operative_history_cases")
    .select("id")
    .eq("case_key", caseKey)
    .maybeSingle();

  const payload = {
    case_key: caseKey,
    preventivo_id: preventivoId,
    lavorazione_id: row.lavorazione_id,
    mezzo_id: row.mezzo_id,
    cliente_norm: String(row.cliente ?? "").trim().toLowerCase(),
    technical_blob_norm: normPhrase(tech),
    client_description: client,
    intervenuto_at: row.updated_at ?? row.created_at,
    source_quality: "operator_approved" as const,
    indexed_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await supabase.from("operative_history_cases").update(payload).eq("id", existing.id);
    return;
  }

  const { data: inserted } = await supabase.from("operative_history_cases").insert(payload).select("id").single();
  if (inserted?.id) {
    await supabase.from("operative_history_signals").upsert({
      case_id: inserted.id,
      confirmed_weight: 1,
      usage_count: 0,
      correction_count: 0,
      updated_at: new Date().toISOString(),
    });
  }
}

export async function recordOperativeHistoryFeedback(
  supabase: SupabaseClient,
  opts: { preventivoId: string; zeroEdit: boolean },
): Promise<void> {
  await upsertOperativeHistoryCaseFromPreventivo(supabase, opts.preventivoId);
  const { data: caseRow } = await supabase
    .from("operative_history_cases")
    .select("id")
    .eq("preventivo_id", opts.preventivoId)
    .maybeSingle();
  if (!caseRow?.id) return;

  const delta = opts.zeroEdit ? 0.15 : 0.05;
  const { data: sig } = await supabase
    .from("operative_history_signals")
    .select("confirmed_weight, usage_count")
    .eq("case_id", caseRow.id)
    .maybeSingle();

  await supabase.from("operative_history_signals").upsert({
    case_id: caseRow.id,
    confirmed_weight: Math.min(3, Number(sig?.confirmed_weight ?? 1) + delta),
    usage_count: Number(sig?.usage_count ?? 0) + 1,
    last_used_at: new Date().toISOString(),
    last_confirmed_at: opts.zeroEdit ? new Date().toISOString() : undefined,
    updated_at: new Date().toISOString(),
  });
}

export async function rebuildOperativeHistoryIndex(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase.from("preventivi").select(PREVENTIVI_COLUMNS);
  let n = 0;
  for (const row of data ?? []) {
    await upsertOperativeHistoryCaseFromPreventivo(supabase, row.id);
    n++;
  }
  return n;
}
