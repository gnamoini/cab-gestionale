import { spawnSync } from "node:child_process";
import { exitWithGate, printGateResult, tailOutput } from "../lib/ci/gate-output";

const GATE_NAME = "TypeScript (tsc --noEmit)";

function main() {
  const r = spawnSync("npx", ["tsc", "--noEmit"], {
    shell: true,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;

  if (r.status === 0) {
    printGateResult({ name: GATE_NAME, status: "PASS", blockers: [] });
    exitWithGate("PASS");
  }

  const detail = tailOutput(output);
  const blocker = detail
    ? `TypeScript compilation failed:\n${detail}`
    : "TypeScript compilation failed (tsc --noEmit).";

  printGateResult({ name: GATE_NAME, status: "FAIL", blockers: [blocker] });
  exitWithGate("FAIL");
}

main();
