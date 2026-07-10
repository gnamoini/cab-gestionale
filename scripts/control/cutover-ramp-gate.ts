#!/usr/bin/env npx tsx
/**
 * Fase 3 — Ramp gate bundle.
 * npm run control:cutover-ramp-gate [-- --limit=20]
 */
import { spawnSync } from "node:child_process";

const limit = process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "20";

function run(cmd: string, args: string[]): number {
  console.log(`\n> ${cmd} ${args.join(" ")}\n`);
  const r = spawnSync(cmd, args, { encoding: "utf8", shell: true, stdio: "inherit" });
  return r.status ?? 1;
}

function main(): void {
  let code = 0;
  code ||= run("npm", ["run", "control:shadow-report", "--", "--gate", `--limit=${limit}`]);
  code ||= run("npm", ["run", "control:duration:baseline"]);
  code ||= run("npx", ["tsx", "lib/control/control-owner.test.ts"]);

  if (code !== 0) {
    console.error("\ncontrol:cutover-ramp-gate — FAIL");
    process.exit(1);
  }
  console.log("\ncontrol:cutover-ramp-gate — PASS");
}

main();
