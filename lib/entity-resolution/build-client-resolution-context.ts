import type { ResolutionDataSources } from "@/lib/entity-resolution/build-resolution-context";
import { emptyKnownCorrectionsStore } from "@/lib/entity-resolution/known-corrections";
import { emptyResolutionCacheStore } from "@/lib/entity-resolution/resolution-cache";
import { parseEntityAliasesPayload } from "@/lib/entity-resolution/settings-aliases";
import type { ResolutionRuntimeContext } from "@/lib/entity-resolution/resolve-capture-graph";
import { llmPickEntityCandidate } from "@/lib/entity-resolution/entity-resolution-llm";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { CabAppSettingsResolved } from "@/src/lib/app-settings/resolve-from-rows";
import { resolveCabAppSettingsFallback } from "@/src/lib/app-settings/settings-fallback";

export function buildClientResolutionContext(input: {
  sharedGlobalOpts: GlobalOptionsSlice;
  magazzino?: readonly RicambioMagazzino[];
  mezzi?: readonly MezzoGestito[];
  aliases?: ReturnType<typeof parseEntityAliasesPayload>;
}): ResolutionRuntimeContext | null {
  if (input.sharedGlobalOpts.isLoading) return null;
  const settings: CabAppSettingsResolved = {
    lavorazioni: input.sharedGlobalOpts.lavorazioni,
    mezziListe: input.sharedGlobalOpts.mezziListe,
    magazzinoMaster: input.sharedGlobalOpts.magazzinoMaster,
    preventiviDefaults: input.sharedGlobalOpts.preventiviDefaults,
    dipendenti: input.sharedGlobalOpts.dipendenti,
    branding: resolveCabAppSettingsFallback().branding,
  };
  const sources: ResolutionDataSources = {
    settings,
    magazzino: input.magazzino ?? [],
    mezzi: input.mezzi ?? [],
  };
  return {
    sources,
    aliases: input.aliases ?? {},
    corrections: emptyKnownCorrectionsStore(),
    cache: emptyResolutionCacheStore(),
    llmResolver: llmPickEntityCandidate,
  };
}

export function ambiguousFieldsFromAudit(
  results: readonly { fieldKey: string; status?: string }[],
): string[] {
  return results.filter((r) => r.status === "ambiguous").map((r) => r.fieldKey);
}
