import { spawnSync } from "node:child_process";
import { exitWithGate, printGateResult, tailOutput } from "../lib/ci/gate-output";

const GATE_NAME = "Next.js build (npm run build)";

function main() {
  const r = spawnSync("npm", ["run", "build"], {
    shell: true,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? "production" },
  });
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;

  if (r.status === 0) {
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
