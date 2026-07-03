import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildPublishedSnapshot,
  hashDraftBundle,
  hashPublishedSnapshot,
  validateTkbDraftBundle,
} from "./tkb-snapshot-builder";
import { TKB_BUILD_VERSION, TKB_BUILDER_VERSION, TKB_PIPELINE_VERSION } from "./versions";
import type { PublishTkbResult, TkbBuildReport, TkbDraftBundle, TkbPublishedSnapshot } from "./types";

export type StoredPublishedRow = {
  kb_version: number;
  snapshot_json: TkbPublishedSnapshot;
  snapshot_hash: string;
  draft_hash: string;
  published_at: string;
  published_by: string | null;
  change_summary: string | null;
  pipeline_version: string;
  builder_version: string;
  build_version: string;
  build_duration_ms: number | null;
  build_stats: TkbBuildReport | Record<string, unknown>;
  app_git_sha: string | null;
};

export async function loadLatestPublishedSnapshot(
  supabase: SupabaseClient,
): Promise<{ snapshot: TkbPublishedSnapshot; draftHash: string; snapshotHash: string } | null> {
  const { data, error } = await supabase
    .from("tkb_published_snapshots")
    .select("kb_version, snapshot_json, draft_hash, snapshot_hash")
    .order("kb_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const snap = data.snapshot_json as TkbPublishedSnapshot;
  return { snapshot: snap, draftHash: data.draft_hash, snapshotHash: data.snapshot_hash };
}

export async function loadPublishedSnapshotByVersion(
  supabase: SupabaseClient,
  kbVersion: number,
): Promise<TkbPublishedSnapshot | null> {
  const { data } = await supabase
    .from("tkb_published_snapshots")
    .select("snapshot_json")
    .eq("kb_version", kbVersion)
    .maybeSingle();
  return (data?.snapshot_json as TkbPublishedSnapshot) ?? null;
}

export type PublishDraftOpts = {
  changeSummary?: string;
  publishedBy?: string;
  buildReport?: TkbBuildReport;
  buildDurationMs?: number;
};

export async function publishDraftToDb(
  supabase: SupabaseClient,
  bundle: TkbDraftBundle,
  opts: PublishDraftOpts = {},
): Promise<PublishTkbResult> {
  validateTkbDraftBundle(bundle);
  const draftHash = hashDraftBundle(bundle);
  const latest = await loadLatestPublishedSnapshot(supabase);
  if (latest && latest.draftHash === draftHash) {
    return {
      kbVersion: latest.snapshot.kbVersion,
      snapshotHash: latest.snapshotHash,
      draftHash,
      created: false,
      idempotent: true,
    };
  }

  const kbVersion = (latest?.snapshot.kbVersion ?? 0) + 1;
  const publishedAt = new Date().toISOString();
  const snapshot = buildPublishedSnapshot(bundle, kbVersion, publishedAt);
  const snapshotHash = hashPublishedSnapshot(snapshot);
  const gitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_SHA ?? null;

  const { error } = await supabase.from("tkb_published_snapshots").insert({
    kb_version: kbVersion,
    snapshot_json: snapshot,
    snapshot_hash: snapshotHash,
    draft_hash: draftHash,
    published_at: publishedAt,
    published_by: opts.publishedBy ?? null,
    change_summary: opts.changeSummary ?? null,
    supersedes_kb_version: latest?.snapshot.kbVersion ?? null,
    pipeline_version: TKB_PIPELINE_VERSION,
    builder_version: TKB_BUILDER_VERSION,
    build_version: TKB_BUILD_VERSION,
    build_duration_ms: opts.buildDurationMs ?? bundle.buildReport?.durationMs ?? null,
    build_stats: opts.buildReport ?? bundle.buildReport ?? {},
    app_git_sha: gitSha,
  });

  if (error) throw new Error(`publish TKB: ${error.message}`);

  await supabase.from("tkb_version_registry").upsert({
    kb_version: kbVersion,
    published_at: publishedAt,
    published_by: opts.publishedBy ?? null,
    change_summary: opts.changeSummary ?? null,
    snapshot_hash: snapshotHash,
    draft_hash: draftHash,
  });

  return { kbVersion, snapshotHash, draftHash, created: true, idempotent: false };
}

export type DraftStoreRow = {
  draft_json: TkbDraftBundle;
  draft_hash: string;
  build_stats: TkbBuildReport;
  built_at: string;
  stale: boolean;
  pending_events: unknown[];
  build_mode: string;
};

export async function loadTkbDraftStore(supabase: SupabaseClient): Promise<DraftStoreRow | null> {
  const { data } = await supabase.from("tkb_draft_store").select("*").eq("id", 1).maybeSingle();
  if (!data) return null;
  return data as unknown as DraftStoreRow;
}

export async function saveTkbDraftStore(
  supabase: SupabaseClient,
  bundle: TkbDraftBundle,
  opts: { stale?: boolean; pendingEvents?: unknown[]; buildMode?: string } = {},
): Promise<void> {
  const draftHash = hashDraftBundle(bundle);
  const row = {
    id: 1,
    draft_json: bundle,
    draft_hash: draftHash,
    build_stats: bundle.buildReport ?? {},
    built_at: new Date().toISOString(),
    stale: opts.stale ?? false,
    pending_events: opts.pendingEvents ?? [],
    build_mode: opts.buildMode ?? bundle.buildReport?.buildMode ?? "full",
    last_full_build_at: bundle.buildReport?.buildMode === "full" ? new Date().toISOString() : undefined,
  };
  const { error } = await supabase.from("tkb_draft_store").upsert(row);
  if (error) throw new Error(`save draft: ${error.message}`);
}

export async function markTkbDraftStaleDb(supabase: SupabaseClient, pendingEvents: unknown[]): Promise<void> {
  const existing = await loadTkbDraftStore(supabase);
  const { error } = await supabase.from("tkb_draft_store").upsert({
    id: 1,
    draft_json: existing?.draft_json ?? {},
    draft_hash: existing?.draft_hash ?? "",
    build_stats: existing?.build_stats ?? {},
    built_at: existing?.built_at ?? new Date().toISOString(),
    stale: true,
    pending_events: pendingEvents,
    build_mode: existing?.build_mode ?? "incremental",
  });
  if (error) throw new Error(`mark stale: ${error.message}`);
}
