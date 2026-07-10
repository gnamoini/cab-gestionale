import "server-only";

import {
  createImportCorrelationId,
  formatImportCorrelationDisplay,
} from "@/lib/import-core/correlation-id";
import {
  createImportExecution,
  findCompletedExecutionForReuse,
  getImportExecution,
  updateImportExecutionStatus,
} from "@/lib/import-core/import-executions.server";
import { writeImportAuditEvent } from "@/lib/import-core/import-audit-events.server";
import { runBusinessValidator } from "@/lib/import-core/business-validator";
import { validateOrdineFornitoreBusiness } from "@/lib/import-core/business-validators/ordine-fornitore-validator";
import type { ImportExecutionFeature } from "@/lib/import-core/types";
import { assertImportFileProcessAccess } from "@/lib/import-files/import-file-access.server";
import { buildOrdineFornitoreImportAnalyzeFromSource } from "@/lib/ordini-fornitori/import/build-ordine-fornitore-import-analyze.server";
import { buildListinoImportPreviewFromImportFile } from "@/lib/magazzino/listino-import/listino-import-from-import-file.server";
import type { ImportSourceRef } from "@/lib/import-sources/types";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function runImportFileExecution(input: {
  importFileId: string;
  feature: ImportExecutionFeature;
  userId: string;
  companyId: string;
  correlationId?: string;
  forceReprocess?: boolean;
  async?: boolean;
}): Promise<{
  executionId: string;
  correlationId: string;
  correlationDisplay: string;
  status: string;
  reused: boolean;
  result?: unknown;
}> {
  const correlationId = input.correlationId ?? createImportCorrelationId();
  const sb = await createSupabaseServerUserClient();

  if (!input.forceReprocess) {
    const existing = await findCompletedExecutionForReuse(sb, {
      companyId: input.companyId,
      importFileId: input.importFileId,
      feature: input.feature,
    });
    if (existing?.result) {
      return {
        executionId: existing.id,
        correlationId: existing.correlationId,
        correlationDisplay: formatImportCorrelationDisplay(existing.correlationId),
        status: existing.status,
        reused: true,
        result: existing.result,
      };
    }
  } else {
    await writeImportAuditEvent(sb, {
      companyId: input.companyId,
      correlationId,
      eventType: "FORCE_REPROCESS",
      severity: "warning",
      createdBy: input.userId,
      importFileId: input.importFileId,
    });
  }

  const execution = await createImportExecution(sb, {
    companyId: input.companyId,
    importFileId: input.importFileId,
    feature: input.feature,
    correlationId,
    createdBy: input.userId,
  });

  if (input.async) {
    return {
      executionId: execution.id,
      correlationId,
      correlationDisplay: formatImportCorrelationDisplay(correlationId),
      status: execution.status,
      reused: false,
    };
  }

  return processImportExecution(sb, {
    executionId: execution.id,
    importFileId: input.importFileId,
    feature: input.feature,
    userId: input.userId,
    companyId: input.companyId,
    correlationId,
  });
}

async function processImportExecution(
  sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>,
  input: {
    executionId: string;
    importFileId: string;
    feature: ImportExecutionFeature;
    userId: string;
    companyId: string;
    correlationId: string;
  },
): Promise<{
  executionId: string;
  correlationId: string;
  correlationDisplay: string;
  status: string;
  reused: boolean;
  result?: unknown;
}> {
  await updateImportExecutionStatus(sb, {
    executionId: input.executionId,
    status: "processing",
    touchHeartbeat: true,
  });

  try {
    let result: unknown;
    let businessStatus: "ready_to_commit" | "needs_review" = "ready_to_commit";

    if (input.feature === "ordine_fornitore") {
      const source: ImportSourceRef = { type: "import_file", id: input.importFileId };
      const analyze = await buildOrdineFornitoreImportAnalyzeFromSource(source, input.userId, {});
      const business = await runBusinessValidator(validateOrdineFornitoreBusiness, {
        righe: analyze.record.righe.map((r) => ({
          codice: r.codice,
          descrizione: r.descrizione,
          quantita: r.quantita,
          prezzo: r.prezzoUnitario,
        })),
        totaleDocumento: analyze.record.totale,
        fornitoreTrovato: analyze.fornitoreMatch.matched,
      });
      businessStatus = business.status === "ok" ? "ready_to_commit" : "needs_review";
      result = { analyze, business };
    } else if (input.feature === "listino_pdf" || input.feature === "listino_columns") {
      const preview = await buildListinoImportPreviewFromImportFile(input.importFileId, input.userId);
      businessStatus = "ready_to_commit";
      result = { preview };
    } else {
      throw new Error(`Feature non supportata: ${input.feature}`);
    }

    await updateImportExecutionStatus(sb, {
      executionId: input.executionId,
      status: businessStatus,
      result: result as Record<string, unknown>,
    });

    return {
      executionId: input.executionId,
      correlationId: input.correlationId,
      correlationDisplay: formatImportCorrelationDisplay(input.correlationId),
      status: businessStatus,
      reused: false,
      result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Elaborazione fallita";
    const errorCode = message.includes("timeout") ? "AI_TIMEOUT" : "AI_PARSE_ERROR";
    await updateImportExecutionStatus(sb, {
      executionId: input.executionId,
      status: "failed",
      errorCode,
    });
    throw error;
  }
}

export async function processQueuedImportExecution(input: {
  executionId: string;
  userId: string;
}): Promise<{
  executionId: string;
  correlationId: string;
  correlationDisplay: string;
  status: string;
  reused: boolean;
  result?: unknown;
}> {
  const sb = await createSupabaseServerUserClient();
  const row = await getImportExecution(sb, input.executionId);
  if (!row) throw new Error("Execution non trovata");
  if (row.status !== "queued" && row.status !== "processing") {
    return {
      executionId: row.id,
      correlationId: row.correlationId,
      correlationDisplay: formatImportCorrelationDisplay(row.correlationId),
      status: row.status,
      reused: false,
      result: row.result ?? undefined,
    };
  }

  await assertImportFileProcessAccess(row.importFileId, input.userId);

  return processImportExecution(sb, {
    executionId: row.id,
    importFileId: row.importFileId,
    feature: row.feature,
    userId: input.userId,
    companyId: row.companyId,
    correlationId: row.correlationId,
  });
}

export async function getImportExecutionResponse(executionId: string) {
  const sb = await createSupabaseServerUserClient();
  const row = await getImportExecution(sb, executionId);
  if (!row) return null;
  return {
    ...row,
    correlationDisplay: formatImportCorrelationDisplay(row.correlationId),
  };
}

export async function assertImportFileAccess(importFileId: string, userId: string) {
  await assertImportFileProcessAccess(importFileId, userId);
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("import_files")
    .select("id, kind, company_id, uploaded_by, status, sha256")
    .eq("id", importFileId)
    .maybeSingle();
  if (error || !data) throw new Error("File import non trovato");
  return {
    id: String(data.id),
    kind: data.kind as string,
    companyId: String(data.company_id),
    uploadedBy: String(data.uploaded_by),
    status: String(data.status),
    sha256: data.sha256 ? String(data.sha256) : null,
  };
}
