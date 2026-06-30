import "server-only";

import { createImportBatch, updateImportBatchProgress } from "@/lib/data-import/core/batch-store.server";
import type { ImportExecuteResult } from "@/lib/data-import/core/types";
import { IMPORT_EXECUTE_CHUNK } from "@/lib/data-import/core/types";
import type { ClientiImportDecision } from "@/lib/data-import/entities/clienti/clienti-import-schema";
import { buildClienteEntityKey } from "@/lib/validation/entity-keys";
import { clienteSedeFieldsToDb } from "@/lib/clienti/clienti-anagrafica-db-adapter";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

async function ensureClienteInSettingsList(sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>, nome: string) {
  const { data: row } = await sb.from("app_settings").select("payload").eq("module", "mezzi").eq("key", "liste").maybeSingle();
  const payload = (row?.payload && typeof row.payload === "object" ? row.payload : {}) as Record<string, unknown>;
  const clienti = Array.isArray(payload.clienti) ? [...(payload.clienti as string[])] : [];
  const trimmed = nome.trim();
  if (!trimmed) return;
  const exists = clienti.some((c) => c.trim().toLowerCase() === trimmed.toLowerCase());
  if (exists) return;
  clienti.push(trimmed);
  clienti.sort((a, b) => a.localeCompare(b, "it"));
  await sb.rpc("bulk_upsert_app_settings", {
    p_items: [{ module: "mezzi", key: "liste", payload: { ...payload, clienti } }],
  });
}

async function upsertClienteRow(
  sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>,
  row: ClientiImportDecision["row"],
  entityKey: string,
  meta: Record<string, unknown>,
  clienteId?: string,
): Promise<string> {
  const payload = {
    nome_display: row.nomeDisplay.trim(),
    ragione_sociale: row.ragioneSociale?.trim() || null,
    partita_iva: row.partitaIva || null,
    codice_destinatario: row.codiceDestinatario || null,
    note: row.note?.trim() || null,
    in_lista_settings: true,
    meta,
  };

  if (clienteId) {
    const { error } = await sb.from("clienti_anagrafiche").update(payload).eq("id", clienteId);
    if (error) throw new Error(error.message);
    return clienteId;
  }

  const { data: inserted, error: insErr } = await sb
    .from("clienti_anagrafiche")
    .insert({ ...payload, entity_key: entityKey })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  return inserted.id as string;
}

export async function executeClientiImport(input: {
  batchId: string;
  userId: string;
  fileName: string;
  decisions: ClientiImportDecision[];
}): Promise<ImportExecuteResult> {
  const started = Date.now();
  const sb = await createSupabaseServerUserClient();
  await updateImportBatchProgress(input.batchId, {
    status: "running",
    started_at: new Date().toISOString(),
  });

  const result: ImportExecuteResult = {
    batchId: input.batchId,
    status: "success",
    stats: { created: 0, updated: 0, skipped: 0, errors: 0, warnings: 0 },
    errors: [],
    durationMs: 0,
  };

  for (let i = 0; i < input.decisions.length; i += IMPORT_EXECUTE_CHUNK) {
    const chunk = input.decisions.slice(i, i + IMPORT_EXECUTE_CHUNK);
    for (const decision of chunk) {
      if (decision.action === "skip") {
        result.stats.skipped += 1;
        continue;
      }

      const row = decision.row;
      const nome = row.nomeDisplay.trim();
      if (!nome) {
        result.stats.errors += 1;
        result.errors.push({ rowIndex: row.rowIndex, message: "Nome cliente mancante." });
        continue;
      }

      const entityKey = buildClienteEntityKey(nome);
      if (!entityKey) {
        result.stats.errors += 1;
        result.errors.push({ rowIndex: row.rowIndex, message: "Nome cliente non valido." });
        continue;
      }

      try {
        await ensureClienteInSettingsList(sb, nome);
      } catch {
        result.stats.warnings += 1;
      }

      const meta: Record<string, unknown> = {
        dataImport: { batchId: input.batchId, fileName: input.fileName },
      };
      if (row.codiceFiscale) meta.codice_fiscale = row.codiceFiscale;
      if (row.scontoRicambi != null) meta.sconto_ricambi_percent = row.scontoRicambi;

      try {
        let clienteId = decision.duplicateClienteId;
        if (!clienteId) {
          const { data: existing } = await sb.from("clienti_anagrafiche").select("id").eq("entity_key", entityKey).maybeSingle();
          clienteId = existing?.id;
        }

        const isCreate = decision.action === "create" && !clienteId;
        const isUpdate = (decision.action === "update" || decision.action === "create") && clienteId;

        if (decision.action === "create" && clienteId) {
          result.stats.skipped += 1;
          continue;
        }

        if (isCreate) {
          clienteId = await upsertClienteRow(sb, row, entityKey, meta);
          result.stats.created += 1;
        } else if (isUpdate && clienteId) {
          await upsertClienteRow(sb, row, entityKey, meta, clienteId);
          result.stats.updated += 1;
        } else {
          result.stats.errors += 1;
          result.errors.push({ rowIndex: row.rowIndex, message: "Cliente non trovato per aggiornamento." });
          continue;
        }

        if (row.sedeLegale?.via || row.sedeLegale?.cap) {
          const sedeDb = clienteSedeFieldsToDb(clienteId, "legale", {
            via: row.sedeLegale.via ?? "",
            numeroCivico: row.sedeLegale.civico ?? "",
            cap: row.sedeLegale.cap ?? "",
            citta: row.sedeLegale.citta ?? "",
            provincia: row.sedeLegale.provincia ?? "",
            stato: "IT",
          });
          await sb.from("clienti_sedi").upsert(sedeDb, { onConflict: "cliente_id,tipo" });
        }

        const contatti: Array<{ cliente_id: string; etichetta: string; tipo: string; valore: string; ordine: number }> = [];
        if (row.email?.trim()) contatti.push({ cliente_id: clienteId, etichetta: "Email", tipo: "email", valore: row.email.trim(), ordine: 0 });
        if (row.pec?.trim()) contatti.push({ cliente_id: clienteId, etichetta: "PEC", tipo: "pec", valore: row.pec.trim(), ordine: 1 });
        if (row.telefono?.trim())
          contatti.push({ cliente_id: clienteId, etichetta: "Telefono", tipo: "telefono", valore: row.telefono.trim(), ordine: 2 });
        if (contatti.length) {
          await sb.from("clienti_contatti").delete().eq("cliente_id", clienteId);
          await sb.from("clienti_contatti").insert(contatti);
        }
      } catch (e) {
        result.stats.errors += 1;
        result.errors.push({ rowIndex: row.rowIndex, message: e instanceof Error ? e.message : "Errore riga." });
      }
    }
  }

  result.durationMs = Date.now() - started;
  result.status =
    result.stats.errors > 0 && result.stats.created + result.stats.updated === 0
      ? "failed"
      : result.stats.errors > 0
        ? "partial"
        : "success";

  await updateImportBatchProgress(input.batchId, {
    status: result.status,
    finished_at: new Date().toISOString(),
    stats: result.stats,
    error_log: result.errors.slice(0, 500),
  });

  return result;
}

export async function startClientiImportBatch(
  userId: string,
  fileName: string,
  mapping: Record<string, unknown>,
  options?: { fileSha256?: string },
) {
  return createImportBatch({
    entity: "clienti_anagrafica",
    file_name: fileName,
    file_sha256: options?.fileSha256,
    mapping,
    created_by: userId,
  });
}
