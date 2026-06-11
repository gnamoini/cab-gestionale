/**
 * Validate selector snapshot schema (one version or all).
 *
 * Usage:
 *   npm run selector:snapshot:validate
 *   npm run selector:snapshot:validate -- snap-1
 */
import {
  DEFAULT_PROMOTION_REGISTRY_PATH,
  loadPromotionRegistry,
} from "@/lib/selector-core/selector-config-promotion-registry";
import {
  listSnapshots,
  validateSnapshotVersion,
} from "@/lib/selector-core/selector-snapshot-registry";

function main(): void {
  loadPromotionRegistry(DEFAULT_PROMOTION_REGISTRY_PATH);
  const registry = loadPromotionRegistry(DEFAULT_PROMOTION_REGISTRY_PATH);
  const target = process.argv[2];
  const versions = target ? [target] : listSnapshots();

  for (const version of versions) {
    const result = validateSnapshotVersion(version, undefined, registry);
    console.log(`validated ${version}: schemaHash=${result.schemaHash}`);
  }
}

main();
