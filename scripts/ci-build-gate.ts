import { spawnSync } from "node:child_process";
import { exitWithGate, printGateResult, tailOutput } from "../lib/ci/gate-output";

const GATE_NAME = "Next.js build (npm run build)";

function runBuildBudgetGate(): { ok: boolean; detail?: string } {
  const r = spawnSync("node", ["scripts/ops/extract-build-budgets.mjs", "--gate"], {
    shell: true,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.status === 0) return { ok: true };
  return { ok: false, detail: tailOutput(output) || "build budget gate failed" };
}

function main() {
  const r = spawnSync("npm", ["run", "build"], {
    shell: true,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? "production" },
  });
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;

  if (r.status === 0) {
    const budget = runBuildBudgetGate();
    if (!budget.ok) {
      printGateResult({
        name: GATE_NAME,
        status: "FAIL",
        blockers: [budget.detail ?? "Performance build budget exceeded"],
      });
      exitWithGate("FAIL");
    }
    printGateResult({ name: GATE_NAME, status: "PASS", blockers: [] });
    exitWithGate("PASS");
  }

  const detail = tailOutput(output);
  const blocker = detail
    ? `Next.js build failed:\n${detail}`
    : "Next.js build failed (npm run build).";

  printGateResult({ name: GATE_NAME, status: "FAIL", blockers: [blocker] });
  exitWithGate("FAIL");
}

main();
