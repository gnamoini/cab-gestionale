import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  claimDocumentIndexJobs,
  claimUnderstandingJobs,
  markIndexFailed,
  type DocumentAiIndexRow,
} from "@/lib/ai/spare-parts/queue/document-index-queue.server";
import {
  claimPartSearchJobs,
} from "@/lib/ai/spare-parts/queue/part-search-queue.server";
import {
  ensureFileSearchStore,
  loadDocumentBytes,
  uploadDocumentToFileSearch,
} from "@/lib/ai/spare-parts/indexing/file-search-index.server";
import { runDocumentUnderstandingPipeline } from "@/lib/ai/spare-parts/understanding/document-understanding.server";
import { runPartSearchPipeline } from "@/lib/ai/spare-parts/pipeline/search-orchestrator.server";
import {
  readMaxConcurrentDocumentIndexing,
  readMaxConcurrentPartSearch,
} from "@/lib/ai/spare-parts/config";
import { sparePartSearchInputSchema } from "@/lib/ai/spare-parts/types/schemas";
import { logAiObs } from "@/lib/ai/runtime/observability";

const STORE_DISPLAY_NAME = "cab-spare-parts-catalogs";

async function processDocumentIndexJob(sb: SupabaseClient, job: DocumentAiIndexRow): Promise<void> {
  try {
    const loaded = await loadDocumentBytes(sb, job.documento_id);
    if (!loaded) {
      await markIndexFailed(sb, job.id, "DOCUMENT_LOAD_FAILED", "Impossibile leggere il documento", job.attempt_count);
      return;
    }

    const storeName = await ensureFileSearchStore(STORE_DISPLAY_NAME);
    const meta = loaded.meta;
    const upload = await uploadDocumentToFileSearch({
      storeName,
      fileBytes: loaded.bytes,
      mimeType: loaded.mimeType,
      displayName: (typeof meta.nome === "string" ? meta.nome : job.documento_id) as string,
      customMetadata: {
        documentoId: job.documento_id,
        contentHash: job.content_hash,
        version: String(job.version),
      },
    });

    await sb
      .from("document_ai_index")
      .update({
        status: "indexed",
        understanding_status: "pending",
        gemini_store_name: upload.storeName,
        gemini_file_name: upload.fileName,
        operation_name: upload.operationName ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    logAiObs("AI_RESPONSE", { operation: "spare_parts_document_indexed", indexId: job.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "INDEX_FAILED";
    await markIndexFailed(sb, job.id, "INDEX_FAILED", msg, job.attempt_count);
  }
}

async function processUnderstandingJob(sb: SupabaseClient, job: DocumentAiIndexRow): Promise<void> {
  try {
    await runDocumentUnderstandingPipeline(sb, job.id, job.documento_id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNDERSTANDING_FAILED";
    await sb
      .from("document_ai_index")
      .update({
        understanding_status: "failed",
        error_code: "UNDERSTANDING_FAILED",
        error_message: msg.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
  }
}

async function processPartSearchJob(
  sb: SupabaseClient,
  job: { id: string; input_json: Record<string, unknown> },
): Promise<void> {
  try {
    const parsed = sparePartSearchInputSchema.parse(job.input_json);
    await runPartSearchPipeline(sb, job.id, parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SEARCH_FAILED";
    await sb
      .from("ai_part_searches")
      .update({
        status: "failed",
        error_code: "SEARCH_FAILED",
        error_message: msg.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
  }
}

export type SparePartsWorkerResult = {
  documentIndexClaimed: number;
  understandingClaimed: number;
  partSearchClaimed: number;
};

export async function processSparePartsQueues(sb: SupabaseClient): Promise<SparePartsWorkerResult> {
  const indexLimit = readMaxConcurrentDocumentIndexing();
  const searchLimit = readMaxConcurrentPartSearch();

  const indexJobs = await claimDocumentIndexJobs(sb, indexLimit);
  for (const job of indexJobs) {
    await processDocumentIndexJob(sb, job);
  }

  const understandingJobs = await claimUnderstandingJobs(sb, indexLimit);
  for (const job of understandingJobs) {
    await processUnderstandingJob(sb, job);
  }

  const searchJobs = await claimPartSearchJobs(sb, searchLimit);
  for (const job of searchJobs) {
    await processPartSearchJob(sb, job);
  }

  return {
    documentIndexClaimed: indexJobs.length,
    understandingClaimed: understandingJobs.length,
    partSearchClaimed: searchJobs.length,
  };
}

export async function processPartSearchQueueOnly(sb: SupabaseClient): Promise<number> {
  const jobs = await claimPartSearchJobs(sb, readMaxConcurrentPartSearch());
  for (const job of jobs) {
    await processPartSearchJob(sb, job);
  }
  return jobs.length;
}
