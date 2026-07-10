#!/usr/bin/env npx tsx
/**
 * Print control mode diagnostics (CI log + optional JSON sidecar).
 */
import fs from "node:fs";
import { formatControlModeLines, resolveControlMode } from "@/lib/control/control-mode";

function main(): void {
  const mode = resolveControlMode();
  for (const line of formatControlModeLines(mode)) console.log(line);

  const out = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1];
  if (out) fs.writeFileSync(out, `${JSON.stringify(mode, null, 2)}\n`);
}

main();
