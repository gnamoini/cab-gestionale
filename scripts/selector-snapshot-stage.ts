/**
 * Stage a validated selector snapshot (no pointer change).
 *
 * Usage:
 *   npm run selector:snapshot:stage -- snap-1
 */
import {
  DEFAULT_PROMOTION_REGISTRY_PATH,
  loadPromotionRegistry,
} from "@/lib/selector-core/selector-config-promotion-registry";
import { stageSnapshot } from "@/lib/selector-core/selector-snapshot-registry";

function main(): void {
  const version = process.argv[2];
  if (!version) {
    console.error("usage: selector-snapshot-stage.ts <version>");
    process.exit(1);
  }
  loadPromotionRegistry(DEFAULT_PROMOTION_REGISTRY_PATH);
  const registry = loadPromotionRegistry(DEFAULT_PROMOTION_REGISTRY_PATH);
  const snapshot = stageSnapshot(version, undefined, registry);
  console.log(`staged ${snapshot.version}`);
}

main();
