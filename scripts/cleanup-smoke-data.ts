/**
 * Elimina dati persistenti creati dagli smoke Playwright CI (AUDIT-*, E2E-*, smoke-doc).
 *
 * Dry-run (default): npm run smoke:cleanup
 * Apply:            npm run smoke:cleanup:apply
 *
 * Richiede SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_* (.env.local o CI).
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import {
  cleanupSmokeData,
  printSmokeCleanupReport,
} from "@/lib/smoke/cleanup-smoke-data";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";

const ROOT = process.cwd();

function loadEnvLocal(): void {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseArgs(): { verbose: boolean; apply: boolean } {
  return {
    verbose: process.argv.includes("--verbose"),
    apply: process.argv.includes("--apply"),
  };
}

async function main(): Promise<void> {
  loadEnvLocal();
  const { verbose, apply: applyFlag } = parseArgs();
  const apply = applyFlag || process.env.SMOKE_CLEANUP_APPLY === "1";

  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY mancante.");
    process.exit(1);
  }

  const { url } = assertSupabasePublicEnv();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const report = await cleanupSmokeData(admin, { apply, verbose });
  printSmokeCleanupReport(report, apply);

  if (report.errors.length > 0) process.exit(1);
}

void main();
