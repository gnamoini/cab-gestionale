import { execFileSync } from "node:child_process";
import { join } from "node:path";

/** Load budgets from TypeScript SSOT via export CLI. */
export function loadPerformanceBudgets(cwd = process.cwd()) {
  const raw = execFileSync("npx", ["tsx", "scripts/ops/export-performance-budgets.ts"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
    shell: true,
  });
  const parsed = JSON.parse(raw);
  return parsed.budgets ?? [];
}
