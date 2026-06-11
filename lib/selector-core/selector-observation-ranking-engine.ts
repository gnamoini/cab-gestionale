/**
 * @advisory v6.3 — observation hint ranking (progressive exploration).
 */
import { getObservationRegistry } from "@/lib/selector-core/selector-observation-registry";

export type RankedHints = {
  critical: string[];
  important: string[];
  related: string[];
  deep: string[];
};

export type ObservationDepth = "critical" | "important" | "related" | "deep";

const CRITICAL_ARTIFACTS = new Set([
  "lib/selector-core/generated/selector-active-pointer.json",
  "lib/selector-core/generated/selector-bundle-manifest.json",
  "lib/selector-core/selector-enforcement-ruleset.ts",
  "lib/selector-core/selector-decision-engine.ts",
  "lib/selector-core/selector-config-runtime-loader.ts",
]);

const BOUNDARY_FILES = new Set([
  "lib/selector-core/selector-enforcement-boundary-guard.ts",
  "lib/selector-core/selector-api-usage-enforcer.ts",
  "lib/selector-core/selector-determinism-gate.ts",
  "lib/selector-core/selector-fallback-trace.ts",
]);

function graphNeighbors(file: string, hops: number): string[] {
  const registry = getObservationRegistry();
  const visited = new Set<string>();
  let frontier = [file];
  const collected: string[] = [];

  for (let hop = 0; hop < hops; hop++) {
    const next: string[] = [];
    for (const node of frontier) {
      const entry = registry.importGraph[node];
      if (!entry) continue;
      for (const neighbor of [...entry.imports, ...entry.importedBy]) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        collected.push(neighbor);
        next.push(neighbor);
      }
    }
    frontier = next;
  }
  return collected;
}

export function rankObservationHints(input: {
  files: string[];
  tests: string[];
  docs?: string[];
  target?: string;
  depth?: ObservationDepth;
}): RankedHints {
  const registry = getObservationRegistry();
  const smokeSet = new Set(registry.smokeTests);
  const allFiles = [...new Set(input.files)];
  const ranked: RankedHints = { critical: [], important: [], related: [], deep: [] };

  for (const file of allFiles) {
    if (CRITICAL_ARTIFACTS.has(file) || BOUNDARY_FILES.has(file)) {
      ranked.critical.push(file);
    } else if (input.target && file.includes(input.target.replace(/^selector-/, ""))) {
      ranked.critical.push(file);
    } else {
      ranked.important.push(file);
    }
  }

  for (const test of input.tests) {
    if (smokeSet.has(test)) ranked.important.push(test);
    else ranked.related.push(test);
  }

  for (const doc of input.docs ?? []) {
    ranked.related.push(doc);
  }

  const seed = allFiles[0];
  if (seed) {
    const oneHop = graphNeighbors(seed, 1);
    const twoHop = graphNeighbors(seed, 2);
    for (const f of oneHop) {
      if (!ranked.critical.includes(f) && !ranked.important.includes(f)) {
        ranked.important.push(f);
      }
    }
    for (const f of twoHop) {
      if (
        !ranked.critical.includes(f) &&
        !ranked.important.includes(f) &&
        !ranked.related.includes(f)
      ) {
        ranked.related.push(f);
      }
    }
  }

  const assigned = new Set([
    ...ranked.critical,
    ...ranked.important,
    ...ranked.related,
  ]);
  for (const [file] of Object.entries(registry.importGraph)) {
    if (!assigned.has(file)) ranked.deep.push(file);
  }
  for (const test of registry.smokeTests) {
    if (!assigned.has(test)) ranked.deep.push(test);
  }

  ranked.critical = [...new Set(ranked.critical)];
  ranked.important = [...new Set(ranked.important)].filter((x) => !ranked.critical.includes(x));
  ranked.related = [...new Set(ranked.related)].filter(
    (x) => !ranked.critical.includes(x) && !ranked.important.includes(x),
  );
  ranked.deep = [...new Set(ranked.deep)].filter(
    (x) =>
      !ranked.critical.includes(x) &&
      !ranked.important.includes(x) &&
      !ranked.related.includes(x),
  );

  return ranked;
}

export function flattenRankedHints(
  ranked: RankedHints,
  depth: ObservationDepth = "important",
): string[] {
  const order: ObservationDepth[] = ["critical", "important", "related", "deep"];
  const depthIndex = order.indexOf(depth);
  const result: string[] = [];
  for (let i = 0; i <= depthIndex; i++) {
    result.push(...ranked[order[i]!]);
  }
  return [...new Set(result)];
}
