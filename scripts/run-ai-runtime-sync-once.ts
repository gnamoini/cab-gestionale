#!/usr/bin/env npx tsx
/** One-off: run AI runtime sync against Supabase (preview gate). */
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
const secretsPath = path.join(process.cwd(), ".ai-runtime-secrets.tmp");
if (fs.existsSync(secretsPath)) {
  const s = JSON.parse(fs.readFileSync(secretsPath, "utf8")) as { master: string; cron: string };
  process.env.AI_MASTER_KEY_ENCRYPTION_KEY = s.master;
}
process.env.AI_RUNTIME_BOOTSTRAP_FALLBACK_ENABLED = "true";

async function main(): Promise<void> {
  const { syncRuntimeConfigToDatabase } = await import("@/lib/ai/runtime/sync-runtime-config");
  const preview = await syncRuntimeConfigToDatabase({ dryRun: true });
  console.log("sync-preview:", JSON.stringify(preview, null, 2));
  const sync = await syncRuntimeConfigToDatabase();
  console.log("sync-result:", JSON.stringify(sync, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
