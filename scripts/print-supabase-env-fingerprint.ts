/**
 * Stampa fingerprint env Supabase (sha8) senza esporre valori.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const out: Record<string, string> = {};
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
    out[key] = value;
  }
  return out;
}

function sha8(value: string | undefined): string {
  if (!value?.trim()) return "missing";
  return createHash("sha256").update(value.trim()).digest("hex").slice(0, 8);
}

const env = parseEnvFile(path.join(process.cwd(), ".env.local"));
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const) {
  const value = env[key] ?? process.env[key];
  console.log(`[fingerprint] ${key} len=${value?.trim().length ?? 0} sha8=${sha8(value)}`);
}
