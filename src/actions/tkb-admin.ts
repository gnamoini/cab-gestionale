"use server";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { verifyServerPermission } from "@/src/lib/auth/server-permission-guards";
import { buildTkbDraft, kbStatsFromBuildReport } from "@/lib/domain/technical-knowledge-base/ingestion/builder";
import { runQualityGates } from "@/lib/domain/technical-knowledge-base/quality-gates/quality-gates";
import { publishTkbDraftServer, getLatestKbVersionServer, loadPublishedTkbSnapshotServer } from "@/lib/domain/technical-knowledge-base/tkb-publish.server";
import { loadTkbDraftStore, saveTkbDraftStore } from "@/lib/domain/technical-knowledge-base/tkb-repository.server";
import { rebuildTkbDraftFull } from "@/lib/domain/technical-knowledge-base/sync/tkb-draft-sync.server";
import { runFullBenchmarkComparison } from "@/lib/domain/technical-knowledge-base/benchmark/run-benchmark";
import type { TkbBuildReport, TkbKbStats } from "@/lib/domain/technical-knowledge-base/types";
import { runTdeBenchmarkWithDraft } from "@/lib/domain/technical-knowledge-base/benchmark/run-benchmark";
import { enqueueAndScheduleTkbSync, isTkbSyncTable } from "@/lib/domain/technical-knowledge-base/sync/tkb-sync-queue.server";
import type { TkbChangeHint } from "@/lib/domain/technical-knowledge-base/types";

export type TkbAdminState = {
  kbVersion: number | null;
  draftStale: boolean;
  draftBuiltAt: string | null;
  buildReport: TkbBuildReport | null;
};

export type PublishTkbActionResult =
  | { ok: true; kbVersion: number; idempotent: boolean; buildReport: TkbBuildReport }
  | { ok: false; message: string; blockedBy?: string[] };

export async function getTkbAdminStateAction(): Promise<TkbAdminState | { ok: false; message: string }> {
  const allowed = await verifyServerPermission("manageSecurity");
  if (!allowed) return { ok: false, message: "Accesso riservato agli amministratori." };
  const supabase = await createSupabaseServerUserClient();
  const kbVersion = await getLatestKbVersionServer(supabase);
  const draft = await loadTkbDraftStore(supabase);
  return {
    kbVersion,
    draftStale: draft?.stale ?? true,
    draftBuiltAt: draft?.built_at ?? null,
    buildReport: (draft?.build_stats as TkbBuildReport) ?? null,
  };
}

export async function refreshTkbDraftAction(): Promise<
  { ok: true; buildReport: TkbBuildReport } | { ok: false; message: string }
> {
  const allowed = await verifyServerPermission("manageSecurity");
  if (!allowed) return { ok: false, message: "Accesso riservato agli amministratori." };
  const supabase = await createSupabaseServerUserClient();
  const bundle = await rebuildTkbDraftFull(supabase);
  return { ok: true, buildReport: bundle.buildReport! };
}

export async function publishTkbAction(): Promise<PublishTkbActionResult> {
  const allowed = await verifyServerPermission("manageSecurity");
  if (!allowed) return { ok: false, message: "Accesso riservato agli amministratori." };
  const supabase = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await import("@/lib/domain/technical-knowledge-base/ingestion/register-sources");
  const bundle = await buildTkbDraft(supabase, { mode: "full" });

  let baseline;
  try {
    const prevBench = runTdeBenchmarkWithDraft();
    baseline = { kbCoverage: prevBench.kbCoverage, oar: prevBench.oar, thr: prevBench.thr };
  } catch {
    baseline = undefined;
  }

  const gates = runQualityGates(bundle, baseline);
  if (!gates.ok) {
    await saveTkbDraftStore(supabase, bundle, { stale: false, buildMode: "full" });
    return {
      ok: false,
      message: `Publish bloccato: ${gates.blockedBy.join(", ")}`,
      blockedBy: gates.blockedBy,
    };
  }

  const result = await publishTkbDraftServer(supabase, bundle, {
    changeSummary: "Admin publish da dati operativi",
    publishedBy: user?.id,
    buildReport: bundle.buildReport,
    buildDurationMs: bundle.buildReport?.durationMs,
  });

  await saveTkbDraftStore(supabase, bundle, { stale: false, buildMode: "full" });
  return {
    ok: true,
    kbVersion: result.kbVersion,
    idempotent: result.idempotent,
    buildReport: bundle.buildReport!,
  };
}

export type RunTkbBenchmarkResult =
  | {
      ok: true;
      report: ReturnType<typeof runFullBenchmarkComparison>;
      kbStats: TkbKbStats | null;
    }
  | { ok: false; message: string };

export async function runTkbBenchmarkAction(): Promise<RunTkbBenchmarkResult> {
  const allowed = await verifyServerPermission("manageSecurity");
  if (!allowed) return { ok: false, message: "Accesso riservato agli amministratori." };
  const supabase = await createSupabaseServerUserClient();
  let kbStats: TkbKbStats | null = null;
  try {
    const snap = await loadPublishedTkbSnapshotServer(supabase);
    kbStats = {
      interventi: snap.interventi.length,
      componenti: snap.componenti.length,
      descrizioni: snap.interventi.reduce((n, i) => n + i.attivitaPrincipali.length, 0),
      categorie: snap.categorie.length,
      excludedDeleted: 0,
      sourceCoverage: {},
      warnings: [],
    };
  } catch {
  }
  const draft = await loadTkbDraftStore(supabase);
  if (draft?.build_stats) kbStats = kbStatsFromBuildReport(draft.build_stats as TkbBuildReport);
  return { ok: true, report: runFullBenchmarkComparison(), kbStats };
}

export async function enqueueTkbSyncAction(
  table: string,
  entityId: string,
  operation: TkbChangeHint["operation"] = "update",
): Promise<void> {
  if (!isTkbSyncTable(table)) return;
  const supabase = await createSupabaseServerUserClient();
  await enqueueAndScheduleTkbSync(supabase, [{ entityType: table, entityId, operation }]);
}
