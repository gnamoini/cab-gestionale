#!/usr/bin/env npx tsx
/** Push AI keys + master to Vercel Production + Preview (never logs values). */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const VERCEL_PROJECT = process.env.VERCEL_PUSH_PROJECT?.trim() || "cab-gestionale";

function loadEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return out;
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

function vercelEnvAdd(name: string, value: string, target: "production" | "preview"): boolean {
  const r = spawnSync(
    "npx",
    [
      "vercel",
      "env",
      "add",
      name,
      target,
      "--project",
      VERCEL_PROJECT,
      "--value",
      value,
      "--force",
      "--yes",
      "--sensitive",
    ],
    { encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  if (r.status !== 0) {
    console.error(`FAIL ${name} ${target}:`, (r.stderr ?? r.stdout ?? "").slice(0, 200));
    return false;
  }
  console.log(`OK ${name} → ${target}`);
  return true;
}

const keys = loadEnvFile(path.join(process.cwd(), ".ai-prod-keys.tmp"));
const local = loadEnvFile(path.join(process.cwd(), ".env.local"));
const master = local.AI_MASTER_KEY_ENCRYPTION_KEY?.trim();
if (!keys.KEY_01 || !keys.KEY_02 || !keys.KEY_03 || !keys.KEY_04) {
  console.error("Missing KEY_01/02/03/04 in .ai-prod-keys.tmp");
  process.exit(1);
}
if (!master) {
  console.error("Missing AI_MASTER_KEY_ENCRYPTION_KEY in .env.local");
  process.exit(1);
}

const pairs: [string, string][] = [
  ["AI_PROVIDER_GOOGLE_KEY_01", keys.KEY_01],
  ["AI_PROVIDER_GOOGLE_KEY_02", keys.KEY_02],
  ["AI_PROVIDER_GOOGLE_KEY_03", keys.KEY_03],
  ["AI_PROVIDER_GOOGLE_KEY_04", keys.KEY_04],
  ["GOOGLE_GENERATIVE_AI_API_KEY", keys.KEY_01],
  ["GEMINI_API_KEY_SECONDARY", keys.KEY_02],
  ["AI_MASTER_KEY_ENCRYPTION_KEY", master],
  ["AI_RUNTIME_BOOTSTRAP_FALLBACK_ENABLED", "true"],
];

let ok = true;
for (const env of ["production", "preview"] as const) {
  for (const [name, value] of pairs) {
    if (!vercelEnvAdd(name, value, env)) ok = false;
  }
}
process.exit(ok ? 0 : 1);
