#!/usr/bin/env npx tsx
/**
 * Generate docs/control-matrix.md from registry (declarative SSOT).
 */
import fs from "node:fs";
import path from "node:path";
import { CONTROL_CONTRACT_VERSION, CONTROL_REGISTRY_VERSION } from "@/lib/control/contract";
import { CONTROL_REGISTRY } from "@/lib/control/registry";

const OUT = path.join(process.cwd(), "docs/control-matrix.md");

const lines: string[] = [
  "# Control matrix (generated)",
  "",
  `**Generated:** ${new Date().toISOString().slice(0, 10)}`,
  `**Contract:** ${CONTROL_CONTRACT_VERSION} | **Registry:** ${CONTROL_REGISTRY_VERSION}`,
  "",
  "Do not edit by hand — regenerate with `npm run control:matrix`.",
  "",
  "| ID | Domain | Tier | Severity | Status | Owner |",
  "|----|--------|------|----------|--------|-------|",
];

for (const c of CONTROL_REGISTRY) {
  lines.push(`| \`${c.id}\` | ${c.domain} | ${c.tier} | ${c.severity} | ${c.status} | ${c.owner} |`);
}

lines.push("", "## Impact", "");
for (const c of CONTROL_REGISTRY) {
  lines.push(`- **${c.id}:** ${c.impact.join(", ")}`);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${path.relative(process.cwd(), OUT)}`);
