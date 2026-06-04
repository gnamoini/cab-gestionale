import { exitWithGate, printGateResult } from "../lib/ci/gate-output";
import { runDocumentiUrlInventory } from "../lib/ops/documenti-url-inventory";
import { runStorageConsistencyDiagnostics } from "../lib/ops/storage-consistency-diagnostics";

const GATE_NAME = "Documenti storage inventory (advisory)";

async function main(): Promise<void> {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const storage = await runStorageConsistencyDiagnostics();
  const inventory = await runDocumentiUrlInventory();

  if (!inventory.connected) {
    warnings.push(...inventory.warnings);
  } else {
    warnings.push(
      `Documenti totali: ${inventory.totalRows}; path risolvibili: ${inventory.resolvablePathCount}; non risolvibili: ${inventory.unresolvablePathCount}; legacy http: ${inventory.legacyHttpCount}; legacy bonificabili: ${inventory.legacyResolvableCount}.`,
    );
    if (inventory.missingStorageSampleCount > 0) {
      warnings.push(
        `Campione oggetti mancanti in storage: ${inventory.missingStorageSample
          .slice(0, 5)
          .map((s) => `${s.id} → ${s.storagePath}`)
          .join("; ")}`,
      );
    }
    for (const w of inventory.warnings) warnings.push(w);
    if (inventory.unresolvablePathCount > 0) {
      warnings.push(
        `Esempi non risolvibili: ${inventory.unresolvableSample
          .slice(0, 3)
          .map((s) => s.id)
          .join(", ")}`,
      );
    }
  }

  if (storage.connected) {
    for (const w of storage.warnings) warnings.push(w);
  }

  const status = blockers.length === 0 ? "PASS" : "FAIL";
  printGateResult({ name: GATE_NAME, status, blockers, warnings });
  exitWithGate(status);
}

void main();
