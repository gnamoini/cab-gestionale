import "server-only";

import { prezzoVenditaDaListinoEMarkup } from "@/lib/magazzino/calculations";
import { createImportBatch, updateImportBatchProgress } from "@/lib/data-import/core/batch-store.server";
import type { ImportEntity, ImportExecuteResult } from "@/lib/data-import/core/types";
import { IMPORT_EXECUTE_CHUNK } from "@/lib/data-import/core/types";
import type { MagazzinoImportDecision } from "@/lib/data-import/entities/magazzino/magazzino-import-schema";
import { attachMagazzinoEntityKey } from "@/lib/validation/entity-persistence";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { buildStockMovementAuditPayload } from "@/lib/magazzino/stock-audit-payload";
import { stockApplyMovement } from "@/lib/magazzino/stock-engine.server";

const DEFAULT_MARKUP = 45;

function buildMeta(row: MagazzinoImportDecision["row"], importMeta: Record<string, unknown>) {
  const meta: Record<string, unknown> = { ...importMeta };
  if (row.categoria?.trim()) meta.categoria = row.categoria.trim();
  if (row.note?.trim()) meta.note = row.note.trim();
  if (row.unita_misura?.trim() && row.unita_misura !== "pz") meta.unitaMisura = row.unita_misura.trim();
  if (row.scorta_minima != null && row.scorta_minima >= 0) meta.scortaMinima = row.scorta_minima;
  if (row.sconto_percent != null && row.sconto_percent >= 0) meta.scontoFornitoreOriginale = row.sconto_percent;
  meta.dataImport = { batchId: importMeta.batchId, at: new Date().toISOString() };
  return meta;
}

export async function executeMagazzinoImport(input: {
  batchId: string;
  userId: string;
  fileName: string;
  decisions: MagazzinoImportDecision[];
  updateFields?: string[];
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

  const importMeta = { batchId: input.batchId, fileName: input.fileName };

  for (let i = 0; i < input.decisions.length; i += IMPORT_EXECUTE_CHUNK) {
    const chunk = input.decisions.slice(i, i + IMPORT_EXECUTE_CHUNK);
    for (const decision of chunk) {
      if (decision.action === "skip") {
        result.stats.skipped += 1;
        continue;
      }

      const row = decision.row;
      if (!row.codice?.trim() || row.codice === "—") {
        result.stats.errors += 1;
        result.errors.push({ rowIndex: row.rowIndex, message: "Codice mancante." });
        continue;
      }

      const costo = row.costo ?? 0;
      const prezzoVendita =
        row.prezzo_vendita != null && row.prezzo_vendita > 0
          ? row.prezzo_vendita
          : prezzoVenditaDaListinoEMarkup(costo, DEFAULT_MARKUP);

      if (decision.action === "update" || decision.action === "replace") {
        const targetId = decision.duplicateRicambioId;
        if (!targetId) {
          result.stats.errors += 1;
          result.errors.push({ rowIndex: row.rowIndex, message: "Nessun ricambio esistente da aggiornare." });
          continue;
        }
        const { data: existing, error: readErr } = await sb
          .from("magazzino_ricambi")
          .select("id, meta, nome, quantita, stock_version, costo, prezzo_vendita, marca")
          .eq("id", targetId)
          .maybeSingle();
        if (readErr || !existing) {
          result.stats.errors += 1;
          result.errors.push({ rowIndex: row.rowIndex, message: "Ricambio non trovato." });
          continue;
        }
        const prevMeta =
          existing.meta && typeof existing.meta === "object" && !Array.isArray(existing.meta)
            ? { ...(existing.meta as Record<string, unknown>) }
            : {};
        const patch: Record<string, unknown> = {};
        let targetQuantita: number | null = null;
        if (decision.action === "replace" || !input.updateFields?.length) {
          patch.nome = row.descrizione.trim() || existing.nome;
          patch.marca = row.marca?.trim() || existing.marca;
          patch.costo = costo;
          patch.prezzo_vendita = prezzoVendita > 0 ? prezzoVendita : existing.prezzo_vendita;
          if (row.quantita != null) targetQuantita = row.quantita;
          patch.meta = buildMeta(row, { ...prevMeta, ...importMeta });
        } else {
          const fields = new Set(input.updateFields);
          if (fields.has("descrizione")) patch.nome = row.descrizione.trim();
          if (fields.has("marca")) patch.marca = row.marca?.trim() || null;
          if (fields.has("costo")) patch.costo = costo;
          if (fields.has("prezzo_vendita")) patch.prezzo_vendita = prezzoVendita > 0 ? prezzoVendita : null;
          if (fields.has("quantita") && row.quantita != null) targetQuantita = row.quantita;
          if (fields.has("categoria") || fields.has("note")) {
            patch.meta = buildMeta(row, { ...prevMeta, ...importMeta });
          }
        }

        const existingQ = Number(existing.quantita) || 0;
        const existingVersion = Number(existing.stock_version) || 0;
        if (targetQuantita != null) {
          const delta = Math.round(targetQuantita) - Math.round(existingQ);
          if (delta !== 0) {
            try {
              await stockApplyMovement({
                ricambioId: targetId,
                delta,
                expectedVersion: existingVersion,
                operationId: crypto.randomUUID(),
                origine: "import",
                causale: "import_rettifica",
                contaStatistiche: false,
              });
            } catch (e) {
              result.stats.errors += 1;
              result.errors.push({
                rowIndex: row.rowIndex,
                message: e instanceof Error ? e.message : "Rettifica stock import fallita.",
              });
              continue;
            }
          }
        }

        const updatePayload = attachMagazzinoEntityKey(patch);
        if (Object.keys(patch).length > 0) {
          const { error: updErr } = await sb.from("magazzino_ricambi").update(updatePayload).eq("id", targetId);
          if (updErr) {
            result.stats.errors += 1;
            result.errors.push({ rowIndex: row.rowIndex, message: updErr.message });
            continue;
          }
        }
        const { data: afterRow } = await sb
          .from("magazzino_ricambi")
          .select("id, meta, nome, quantita, stock_version, costo, prezzo_vendita, marca")
          .eq("id", targetId)
          .maybeSingle();
        await writeModificaLog(sb, {
          entita: "magazzino_ricambi",
          entita_id: targetId,
          azione: "UPDATE",
          autore_id: input.userId,
          payload: {
            source: "IMPORT_UPDATE",
            batchId: input.batchId,
            fileName: input.fileName,
            diff: auditDiff(existing, afterRow ?? existing),
            ...(targetQuantita != null &&
            Math.round(targetQuantita) !== Math.round(existingQ)
              ? buildStockMovementAuditPayload({
                  ricambioId: targetId,
                  quantitaBefore: existingQ,
                  quantitaAfter: Number(afterRow?.quantita) || 0,
                  origine: "import",
                  causale: "import_rettifica",
                  stockVersionBefore: existingVersion,
                  stockVersionAfter: Number(afterRow?.stock_version) || existingVersion,
                  extra: { source: "IMPORT_UPDATE", batchId: input.batchId, fileName: input.fileName },
                })
              : {}),
          },
        });
        result.stats.updated += 1;
        continue;
      }

      const insertPayload = attachMagazzinoEntityKey({
        codice: row.codice.trim(),
        nome: row.descrizione.trim() || "Senza descrizione",
        marca: row.marca?.trim() || null,
        quantita: 0,
        costo: costo > 0 ? costo : null,
        prezzo_vendita: prezzoVendita > 0 ? prezzoVendita : null,
        consumo_medio_mensile: null,
        meta: buildMeta(row, { categoria: row.categoria?.trim() || "Generale", ...importMeta }),
      });
      const { data: inserted, error: insErr } = await sb
        .from("magazzino_ricambi")
        .insert(insertPayload)
        .select("id, stock_version")
        .single();
      if (insErr || !inserted) {
        result.stats.errors += 1;
        result.errors.push({ rowIndex: row.rowIndex, message: insErr?.message ?? "Inserimento fallito." });
        continue;
      }
      const initialQ = Math.round(row.quantita ?? 0);
      if (initialQ > 0) {
        try {
          await stockApplyMovement({
            ricambioId: inserted.id,
            delta: initialQ,
            expectedVersion: Number(inserted.stock_version) || 0,
            operationId: crypto.randomUUID(),
            origine: "import",
            causale: "giacenza_iniziale",
            contaStatistiche: false,
          });
        } catch (e) {
          result.stats.errors += 1;
          result.errors.push({
            rowIndex: row.rowIndex,
            message: e instanceof Error ? e.message : "Giacenza iniziale import fallita.",
          });
          continue;
        }
      }
      result.stats.created += 1;
    }
  }

  result.durationMs = Date.now() - started;
  result.status =
    result.stats.errors > 0 && result.stats.created + result.stats.updated === 0
      ? "failed"
      : result.stats.errors > 0
        ? "partial"
        : "success";

  if (result.stats.created > 0 || result.stats.updated > 0) {
    await writeModificaLog(sb, {
      entita: "magazzino_ricambi",
      entita_id: input.batchId,
      azione: "CREATE",
      payload: auditSnapshot({
        import: "magazzino",
        batchId: input.batchId,
        fileName: input.fileName,
        created: result.stats.created,
        updated: result.stats.updated,
        errors: result.stats.errors,
      }),
      autore_id: input.userId,
    });
  }

  await updateImportBatchProgress(input.batchId, {
    status: result.status,
    finished_at: new Date().toISOString(),
    stats: result.stats,
    error_log: result.errors.slice(0, 500),
  });

  return result;
}

export async function startMagazzinoImportBatch(
  userId: string,
  fileName: string,
  mapping: Record<string, unknown>,
  options?: { entity?: ImportEntity; fileSha256?: string },
) {
  return createImportBatch({
    entity: options?.entity ?? "magazzino_ricambi",
    file_name: fileName,
    file_sha256: options?.fileSha256,
    mapping,
    created_by: userId,
  });
}
