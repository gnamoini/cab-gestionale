/**
 * Rollback to previous snapshot version (pointer flip only).
 *
 * Usage:
 *   npm run selector:snapshot:rollback
 */
import { rollbackSnapshot } from "@/lib/selector-core/selector-snapshot-registry";
import { readPointer } from "@/lib/selector-core/selector-snapshot-atomic-switch";

function main(): void {
  const before = readPointer();
  rollbackSnapshot();
  const after = readPointer();
  console.log(
    `rolled back: ${before.activeVersion} → ${after.activeVersion} (previous=${after.previousVersion})`,
  );
}

main();
