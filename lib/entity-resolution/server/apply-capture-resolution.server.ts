import "server-only";

import type { CaptureFieldInput } from "@/lib/entity-resolution/resolve-capture-graph";
import { resolveCaptureGraph } from "@/lib/entity-resolution/resolve-capture-graph";
import { formatCaptureReviewDisplayValue } from "@/lib/document-capture/capture-field-display-value";
import { loadResolutionRuntimeContext } from "@/lib/entity-resolution/server/load-resolution-context.server";
import {
  recordKnownCorrectionServer,
  writeResolutionCacheEntries,
} from "@/lib/entity-resolution/server/persist-resolution.server";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResolutionRuntimeContext } from "@/lib/entity-resolution/resolve-capture-graph";

export async function applyEntityResolutionToCaptureFields(
  sb: SupabaseClient,
  input: {
    companyId: string;
    captureId: string;
    fields: CaptureFieldInput[];
    magazzino?: readonly RicambioMagazzino[];
    mezzi?: readonly MezzoGestito[];
    resolutionContext?: ResolutionRuntimeContext;
  },
) {
  const ctx =
    input.resolutionContext ??
    (await loadResolutionRuntimeContext(sb, input.companyId, {
      magazzino: input.magazzino,
      mezzi: input.mezzi,
    }));
  const { fields: resolved, audit } = await resolveCaptureGraph(input.fields, ctx, {
    captureId: input.captureId,
    companyId: input.companyId,
  });

  const mapped = resolved.map((row) => ({
    field_key: row.field_key,
    raw_value: row.raw_value ?? row.resolution.originalValue ?? null,
    normalized_value:
      row.resolution.status === "resolved" && row.resolution.resolvedLabel
        ? row.resolution.resolvedLabel
        : formatCaptureReviewDisplayValue(row.field_key, {
            raw: row.raw_value ?? row.resolution.originalValue,
            normalized: row.normalized_value,
            resolvedLabel: row.resolution.resolvedLabel,
          }) || null,
    resolution: row.resolution,
  }));

  await writeResolutionCacheEntries(
    sb,
    input.companyId,
    resolved.map((r) => r.resolution),
  );

  return { fields: mapped, audit };
}

export function mergeResolutionIntoFieldRows<
  T extends {
    field_key: string;
    raw_value: string | null;
    normalized_value: string | null;
  },
>(fieldRows: T[], resolution: Awaited<ReturnType<typeof applyEntityResolutionToCaptureFields>>): T[] {
  return fieldRows.map((row) => {
    const hit = resolution.fields.find((f) => f.field_key === row.field_key);
    if (!hit?.normalized_value) return row;
    return { ...row, normalized_value: hit.normalized_value };
  });
}

export { recordKnownCorrectionServer };
