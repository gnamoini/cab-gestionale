import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { getEngineManifestEntry } from "@/lib/report/analytics-engine/engine-metric-manifest";
import { resolveCanonicalMetricId } from "@/lib/report/metrics/resolve-metric-id";

export class AnalyticsMetricValidationError extends Error {
  readonly status = 400;
  readonly invalidIds: readonly string[];

  constructor(message: string, invalidIds: readonly string[]) {
    super(message);
    this.name = "AnalyticsMetricValidationError";
    this.invalidIds = invalidIds;
  }
}

export function validateAnalyticsMetricIds(rawIds: readonly string[]): string[] {
  const invalid: string[] = [];
  const canonical: string[] = [];

  for (const raw of rawIds) {
    const id = resolveCanonicalMetricId(raw.trim());
    if (!id) {
      invalid.push(raw);
      continue;
    }
    const registry = getRegistryEntry(id);
    if (!registry) {
      invalid.push(raw);
      continue;
    }
    if (registry.status === "draft" || registry.status === "blocked") {
      invalid.push(raw);
      continue;
    }
    if (registry.validation?.status === "blocked") {
      invalid.push(raw);
      continue;
    }
    const manifest = getEngineManifestEntry(id);
    if (!manifest) {
      invalid.push(raw);
      continue;
    }
    canonical.push(id);
  }

  if (invalid.length > 0) {
    throw new AnalyticsMetricValidationError(
      `Metriche non supportate dall'Analytics Engine: ${invalid.join(", ")}`,
      invalid,
    );
  }

  return [...new Set(canonical)];
}
