#!/usr/bin/env npx tsx
/**
 * Rebuild self-healing observation registry artifact.
 */
import { writeObservationRegistryArtifact } from "@/lib/selector-core/selector-observation-registry-builder";

const snapshot = writeObservationRegistryArtifact();
console.log(
  JSON.stringify(
    {
      builtAt: snapshot.builtAt,
      domains: Object.fromEntries(
        Object.entries(snapshot.domains).map(([k, v]) => [k, v.files.length]),
      ),
      importGraphNodes: Object.keys(snapshot.importGraph).length,
      smokeTests: snapshot.smokeTests.length,
    },
    null,
    2,
  ),
);
