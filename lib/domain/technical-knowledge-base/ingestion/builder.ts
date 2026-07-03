import type { SupabaseClient } from "@supabase/supabase-js";
import { TKB_BUILDER_VERSION, TKB_PIPELINE_VERSION } from "../versions";
import { countActivities, emptyDraftBundle, mergeFragments, patchDraftFromFragments } from "../merge/merge-engine";
import { collectFromAllAdapters, listTkbAdapters } from "./adapter-registry";
import { createIngestionContext } from "./adapter-types";
import { buildSearchIndex } from "./search-index-builder";
import { draftToFragments } from "./sources/seed.adapter";
import { createTkbSeedDraft } from "../tkb-seed";
import { mergeFragments as mergeOnly } from "../merge/merge-engine";
import type { TkbBuildMode, TkbBuildReport, TkbChangeHint, TkbDraftBundle } from "../types";

export type BuildTkbDraftOptions = {
  mode?: TkbBuildMode;
  hints?: TkbChangeHint[];
  previousDraft?: TkbDraftBundle;
};

function countEntities(bundle: TkbDraftBundle) {
  return {
    interventi: bundle.interventi.length,
    componenti: bundle.componenti.length,
    sintomi: bundle.sintomi.length,
    categorie: bundle.categorie.length,
    procedure: bundle.procedure.length,
    ricambiMap: bundle.ricambiMap.length,
    activities: countActivities(bundle),
  };
}

function hasStructuredData(bundle: TkbDraftBundle): boolean {
  return bundle.interventi.length + bundle.componenti.length + bundle.categorie.length > 0;
}

export async function buildTkbDraft(
  supabase: SupabaseClient,
  opts: BuildTkbDraftOptions = {},
): Promise<TkbDraftBundle> {
  const mode = opts.mode ?? "full";
  const t0 = Date.now();
  const ctx = createIngestionContext(supabase, mode, opts.hints);

  let fragments = await collectFromAllAdapters(ctx);

  // Rimuovi seed fragments; riapplica solo se DB vuoto
  fragments = fragments.filter((f) => f.sourceId !== "seed");
  const merged = mode === "incremental" && opts.previousDraft
    ? patchDraftFromFragments(opts.previousDraft, fragments)
    : mergeFragments(fragments);

  let bundle = merged.bundle;
  if (!hasStructuredData(bundle)) {
    const seedMerged = mergeOnly(draftToFragments(createTkbSeedDraft()));
    bundle = seedMerged.bundle;
    ctx.warnings.push("seed:fallback:db_vuoto");
  }

  bundle.searchIndex = buildSearchIndex(bundle);

  const adapterStats: TkbBuildReport["adapters"] = {};
  for (const a of listTkbAdapters()) {
    const tag = ctx.warnings.find((w) => w.startsWith(`adapter:${a.id}:ok:`));
    const parts = tag?.split(":") ?? [];
    adapterStats[a.id] = {
      durationMs: Number(parts[3]?.replace("ms", "") ?? 0),
      fetched: 0,
      included: fragments.filter((f) => f.sourceId === a.id).length,
      excluded: 0,
      fragments: fragments.filter((f) => f.sourceId === a.id).length,
    };
  }

  const buildReport: TkbBuildReport = {
    builtAt: ctx.now,
    durationMs: Date.now() - t0,
    buildMode: mode,
    pipelineVersion: TKB_PIPELINE_VERSION,
    builderVersion: TKB_BUILDER_VERSION,
    counts: countEntities(bundle),
    delta: { added: merged.audit.added, updated: merged.audit.updated, removed: merged.audit.removed },
    merge: {
      performed: merged.audit.performed,
      duplicatesFound: merged.audit.duplicatesFound,
      conflictsResolved: merged.audit.conflictsResolved,
    },
    excluded: ctx.excluded,
    warnings: ctx.warnings.filter((w) => !w.includes(":ok:")),
    adapters: adapterStats,
  };

  return { ...bundle, buildReport };
}

export function kbStatsFromBuildReport(report: TkbBuildReport) {
  return {
    interventi: report.counts.interventi,
    componenti: report.counts.componenti,
    descrizioni: report.counts.activities,
    categorie: report.counts.categorie,
    excludedDeleted: report.excluded.deleted,
    sourceCoverage: Object.fromEntries(
      Object.entries(report.adapters).map(([k, v]) => [k, { included: v.included, fetched: v.fetched }]),
    ),
    warnings: report.warnings,
  };
}
