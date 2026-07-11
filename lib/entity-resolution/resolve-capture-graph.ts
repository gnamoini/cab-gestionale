import { bindingForFieldKey } from "@/lib/entity-resolution/capture-field-entity-registry";
import {
  poolForDataset,
  restrictedModelPool,
  restrictedRicambioPool,
  type ResolutionDataSources,
} from "@/lib/entity-resolution/build-resolution-context";
import { buildEntityResolutionIndex } from "@/lib/entity-resolution/entity-resolution-index";
import { getEntityResolverConfig } from "@/lib/entity-resolution/entity-resolver-registry";
import { manualResolutionResult, resolveEntity } from "@/lib/entity-resolution/entity-resolver";
import { toResolutionAuditBundle, toResolutionAuditRecord } from "@/lib/entity-resolution/entity-resolution-audit";
import type { KnownCorrectionsStore } from "@/lib/entity-resolution/known-corrections";
import type { ResolutionCacheStore } from "@/lib/entity-resolution/resolution-cache";
import { buildAliasLookupMap, parseEntityAliasesPayload } from "@/lib/entity-resolution/settings-aliases";
import { topologicalFieldOrder } from "@/lib/entity-resolution/capture-field-entity-registry";
import type {
  EntityResolutionResult,
  EntityType,
  ResolutionAuditBundle,
} from "@/lib/entity-resolution/entity-resolution-types";
import type { EntityType as ET } from "@/lib/entity-resolution/entity-resolution-types";

export type CaptureFieldInput = {
  field_key: string;
  raw_value?: string | null;
  normalized_value?: string | null;
  confirmed_value?: string | null;
};

export type ResolvedCaptureField = CaptureFieldInput & {
  resolution: EntityResolutionResult;
};

export type ResolutionRuntimeContext = {
  sources: ResolutionDataSources;
  aliases: ReturnType<typeof parseEntityAliasesPayload>;
  corrections: KnownCorrectionsStore;
  cache: ResolutionCacheStore;
  llmResolver?: Parameters<typeof resolveEntity>[0]["llmResolver"];
};

function fieldOcrValue(row: CaptureFieldInput): string {
  const v = row.confirmed_value ?? row.normalized_value ?? row.raw_value ?? "";
  return typeof v === "string" ? v.trim() : "";
}

function parentResolvedLabel(
  fieldKey: string,
  resolved: Map<string, EntityResolutionResult>,
): string | null {
  const binding = bindingForFieldKey(fieldKey);
  if (!binding?.parentFieldKeys?.length) return null;
  for (const parentPattern of binding.parentFieldKeys) {
    for (const [key, result] of resolved) {
      if (
        key.toLowerCase().replace(/^ingresso\./, "") === parentPattern.toLowerCase() &&
        result.status === "resolved" &&
        result.resolvedLabel
      ) {
        return result.resolvedLabel;
      }
    }
  }
  return null;
}

function buildPools(ctx: ResolutionRuntimeContext): Partial<Record<EntityType, import("@/lib/entity-resolution/entity-resolution-types").EntityCandidate[]>> {
  const pools: Partial<Record<ET, import("@/lib/entity-resolution/entity-resolution-types").EntityCandidate[]>> = {};
  const types: ET[] = [
    "MARCA",
    "MODELLO",
    "CLIENTE",
    "CANTIERE",
    "UTILIZZATORE",
    "FORNITORE",
    "CATEGORIA",
    "RICAMBIO",
    "OPERATORE",
    "TIPO_ATTREZZATURA",
    "TIPO_TELAIO",
    "MEZZO_IDENT",
  ];
  for (const t of types) {
    const cfg = getEntityResolverConfig(t);
    pools[t] = poolForDataset(cfg.dataset, ctx.sources);
  }
  return pools;
}

function restrictedPoolForField(
  fieldKey: string,
  entityType: EntityType,
  resolved: Map<string, EntityResolutionResult>,
  ctx: ResolutionRuntimeContext,
): import("@/lib/entity-resolution/entity-resolution-types").EntityCandidate[] | undefined {
  const binding = bindingForFieldKey(fieldKey);
  const marca =
    parentResolvedLabel(fieldKey, resolved) ??
    [...resolved.entries()].find(([k]) => k.includes("marca"))?.[1]?.resolvedLabel ??
    null;

  if (entityType === "MODELLO" && marca) {
    const hierarchy = binding?.hierarchy ?? "attrezzature";
    return restrictedModelPool(marca, ctx.sources.settings.mezziListe);
  }

  if (entityType === "RICAMBIO") {
    const modello = [...resolved.entries()].find(([k]) => k.includes("modello"))?.[1]?.resolvedLabel ?? null;
    const pool = restrictedRicambioPool(ctx.sources.magazzino, marca, modello);
    return pool.length > 0 ? pool : undefined;
  }

  return undefined;
}

export async function resolveCaptureGraph(
  fields: readonly CaptureFieldInput[],
  ctx: ResolutionRuntimeContext,
  opts?: { captureId?: string; companyId?: string },
): Promise<{ fields: ResolvedCaptureField[]; audit: ResolutionAuditBundle }> {
  const started = performance.now();
  const aliasMap = buildAliasLookupMap(ctx.aliases);
  const index = buildEntityResolutionIndex({ poolsByType: buildPools(ctx), aliasMap });
  const resolved = new Map<string, EntityResolutionResult>();
  const outputs: ResolvedCaptureField[] = [];

  const resolvable = fields.filter((f) => {
    const v = fieldOcrValue(f);
    return v && bindingForFieldKey(f.field_key);
  });

  const order = topologicalFieldOrder(resolvable.map((f) => f.field_key));

  let llmInvocations = 0;
  for (const fieldKey of order) {
    const row = resolvable.find((f) => f.field_key === fieldKey);
    if (!row) continue;
    const binding = bindingForFieldKey(fieldKey);
    if (!binding) continue;

    const originalValue = fieldOcrValue(row);
    const entityType = binding.entityType;
    const config = getEntityResolverConfig(entityType);
    const pool = index.poolsByType.get(entityType) ?? [];
    const restrictedPool = restrictedPoolForField(fieldKey, entityType, resolved, ctx);

    const parentFieldKeys =
      binding.parentFieldKeys?.filter((p) => resolvable.some((f) => f.field_key.toLowerCase().includes(p))) ?? [];

    const llmResolver = config.allowLlm
      ? async (input: Parameters<NonNullable<typeof ctx.llmResolver>>[0]) => {
          llmInvocations += 1;
          return ctx.llmResolver?.(input) ?? null;
        }
      : undefined;

    const result = await resolveEntity({
      entityType,
      fieldKey,
      originalValue,
      pool,
      restrictedPool,
      parentFieldKeys,
      index,
      corrections: ctx.corrections,
      cache: ctx.cache,
      llmResolver,
    });

    resolved.set(fieldKey, result);
    outputs.push({
      ...row,
      normalized_value: result.resolvedLabel ?? result.normalizedValue,
      resolution: result,
    });
  }

  for (const row of fields) {
    if (outputs.some((o) => o.field_key === row.field_key)) continue;
    outputs.push({
      ...row,
      resolution: {
        status: "unresolved",
        entityType: "GENERIC",
        fieldKey: row.field_key,
        originalValue: fieldOcrValue(row),
        normalizedValue: fieldOcrValue(row),
        resolvedLabel: null,
        resolvedId: null,
        confidence: 0,
        strategy: "none",
        reason: "unresolved",
        matchedBy: "no_binding",
        candidateList: [],
        parentFieldKeys: [],
        poolSize: 0,
        poolRestricted: false,
        warnings: [],
        durationMs: 0,
        versions: { algorithm: "1.0.0", normalizer: "1.0.0", resolver: "1.0.0", dictionary: "1.0.0" },
        manualOverride: false,
        cacheHit: false,
      },
    });
  }

  const audit = toResolutionAuditBundle({
    captureId: opts?.captureId,
    companyId: opts?.companyId,
    totalDurationMs: performance.now() - started,
    results: outputs.map((o) => o.resolution),
    llmInvocations,
  });

  return { fields: outputs, audit };
}

export { manualResolutionResult };
