#!/usr/bin/env npx tsx
/**
 * Push env production sul progetto Vercel collegato al repo GitHub (cab-gestionale).
 * ponytail: gestionale-cab è alias CLI legacy — SSOT deploy git = cab-gestionale.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const VERCEL_PROJECT = "cab-gestionale";

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

function vercelEnvSet(
  name: string,
  value: string,
  target: "production" | "preview",
): boolean {
  const add = spawnSync(
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
  if (add.status === 0) {
    console.log(`OK ${name} → ${target}`);
    return true;
  }
  const update = spawnSync(
    "npx",
    [
      "vercel",
      "env",
      "update",
      name,
      target,
      "--project",
      VERCEL_PROJECT,
      "--value",
      value,
      "--yes",
      "--sensitive",
    ],
    { encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  if (update.status !== 0) {
    console.error(`FAIL ${name} ${target}:`, (add.stderr ?? add.stdout ?? update.stderr ?? update.stdout ?? "").slice(0, 300));
    return false;
  }
  console.log(`OK ${name} → ${target} (update)`);
  return true;
}

const local = loadEnvFile(path.join(process.cwd(), ".env.local"));
const master = local.AI_MASTER_KEY_ENCRYPTION_KEY?.trim();
const googlePrimary = local.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
const googleSecondary = local.GEMINI_API_KEY_SECONDARY?.trim();

if (!master) {
  console.error("Missing AI_MASTER_KEY_ENCRYPTION_KEY in .env.local");
  process.exit(1);
}

const pairs: [string, string][] = [
  ["AI_MASTER_KEY_ENCRYPTION_KEY", master],
  ["AI_RUNTIME_BOOTSTRAP_FALLBACK_ENABLED", local.AI_RUNTIME_BOOTSTRAP_FALLBACK_ENABLED?.trim() || "true"],
];

if (googlePrimary) {
  pairs.push(["GOOGLE_GENERATIVE_AI_API_KEY", googlePrimary]);
  pairs.push(["AI_PROVIDER_GOOGLE_KEY_01", googlePrimary]);
}
if (googleSecondary) {
  pairs.push(["GEMINI_API_KEY_SECONDARY", googleSecondary]);
  pairs.push(["AI_PROVIDER_GOOGLE_KEY_02", googleSecondary]);
}
if (local.CRON_SECRET?.trim()) pairs.push(["CRON_SECRET", local.CRON_SECRET.trim()]);
if (local.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
  pairs.push(["SUPABASE_SERVICE_ROLE_KEY", local.SUPABASE_SERVICE_ROLE_KEY.trim()]);
}
if (local.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
  pairs.push(["NEXT_PUBLIC_SUPABASE_URL", local.NEXT_PUBLIC_SUPABASE_URL.trim()]);
}
if (local.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
  pairs.push(["NEXT_PUBLIC_SUPABASE_ANON_KEY", local.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim()]);
}

pairs.push(["NEXT_PUBLIC_SITE_URL", "https://cab-gestionale.vercel.app"]);

let ok = true;
for (const target of ["production", "preview"] as const) {
  for (const [name, value] of pairs) {
    if (!vercelEnvSet(name, value, target)) ok = false;
  }
}

if (!ok) process.exit(1);
console.log(`PUSH OK on ${VERCEL_PROJECT} — ridistribuire production`);
