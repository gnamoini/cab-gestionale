import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const plan = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), ".remediation/migration-alignment-plan.json"), "utf8"),
) as {
  revert_versions: string[];
  repair_applied_versions: string[];
};

function batch<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function runRepair(status: "applied" | "reverted", versions: string[]) {
  if (!versions.length) return;
  for (const chunk of batch(versions, 15)) {
    const args = ["migration", "repair", "--status", status, "--linked", "--yes", ...chunk];
    console.log(`\n> supabase ${args.join(" ")}`);
    execSync(`npx supabase ${args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`, {
      cwd: process.cwd(),
      stdio: "inherit",
    });
  }
}

console.log("Step 1/2: revert MCP ghost versions");
runRepair("reverted", plan.revert_versions);

console.log("\nStep 2/2: mark canonical local versions as applied");
runRepair("applied", plan.repair_applied_versions);

console.log("\nDone repairs.");
