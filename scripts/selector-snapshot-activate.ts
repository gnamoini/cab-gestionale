/**
 * Atomically activate a staged snapshot (pointer swap only).
 *
 * Usage:
 *   npm run selector:snapshot:activate -- v0
 */
import { activateSnapshot } from "@/lib/selector-core/selector-snapshot-registry";
import { readPointer } from "@/lib/selector-core/selector-snapshot-atomic-switch";

function main(): void {
  const version = process.argv[2];
  if (!version) {
    console.error("usage: selector-snapshot-activate.ts <version>");
    process.exit(1);
  }
  const before = readPointer().activeVersion;
  activateSnapshot(version);
  const after = readPointer().activeVersion;
  console.log(`activated ${after} (was ${before})`);
}

main();
