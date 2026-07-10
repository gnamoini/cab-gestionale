#!/usr/bin/env npx tsx
/**
 * Crea label GitHub control-plane-strict (Fase 1 prereq).
 * npm run control:create-strict-label
 * Richiede: gh auth login + permessi maintainer sul repo.
 */
import { spawnSync } from "node:child_process";

const LABEL = "control-plane-strict";
const COLOR = "B60205";
const DESC = "Opt-in strict Control Plane cutover (maintainer only)";

function main(): void {
  const check = spawnSync("gh", ["label", "list", "--search", LABEL], {
    encoding: "utf8",
    shell: true,
  });
  if (check.stdout?.includes(LABEL)) {
    console.log(`Label ${LABEL} already exists`);
    process.exit(0);
  }

  const create = spawnSync(
    "gh",
    ["label", "create", LABEL, "--color", COLOR, "--description", DESC],
    { encoding: "utf8", shell: true, stdio: "inherit" },
  );
  if (create.status !== 0) {
    console.error("Failed to create label — create manually in GitHub UI");
    process.exit(1);
  }
  console.log(`Created label ${LABEL}`);
}

main();
