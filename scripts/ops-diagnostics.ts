import { exitWithGate, printGateResult } from "../lib/ci/gate-output";
import { validateProductionEnv } from "../lib/ops/validate-production-env";
import { runStorageConsistencyDiagnostics } from "../lib/ops/storage-consistency-diagnostics";

const GATE_NAME = "Ops diagnostics (advisory)";

function requireDb(): boolean {
  return (
    process.env.OPS_DIAGNOSTICS_REQUIRE_DB === "1" ||
    process.env.PRODUCTION_CHECK_REQUIRE_DB === "1"
  );
}

async function main(): Promise<void> {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const env = validateProductionEnv();
  for (const f of env.blockers) {
    blockers.push(`${f.id}: ${f.message}`);
  }
  for (const f of env.warnings) {
    warnings.push(`${f.id}: ${f.message}`);
  }

  const storage = await runStorageConsistencyDiagnostics();
  if (!storage.connected) {
    const msg = storage.warnings.join("; ") || "DB non connesso";
    if (requireDb()) blockers.push(`storage-diagnostics: ${msg}`);
    else warnings.push(`storage-diagnostics: ${msg}`);
  } else {
    for (const w of storage.warnings) warnings.push(w);
    if (storage.orphanSamplePaths.length > 0) {
      warnings.push(
        `Orphan sample (max 5): ${storage.orphanSamplePaths.slice(0, 5).join(", ")}`,
      );
    }
  }

  const status = blockers.length === 0 ? "PASS" : "FAIL";
  printGateResult({ name: GATE_NAME, status, blockers, warnings });
  exitWithGate(status);
}

void main();
