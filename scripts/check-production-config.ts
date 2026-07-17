#!/usr/bin/env npx tsx
/**
 * Valida presenza chiavi critiche per Production / Preview / Development.
 * Con Vercel CLI: esegue env pull; in CI senza CLI legge file già presenti o process.env.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PRIMARY_ENV_KEY_NAMES } from "@/lib/ai/gemini-api-keys";

type EnvTarget = "production" | "preview" | "development";

const TARGETS: EnvTarget[] = ["production", "preview", "development"];
const REQUIRED_PUBLIC = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function hasGeminiKey(env: Record<string, string>): boolean {
  return PRIMARY_ENV_KEY_NAMES.some((name) => {
    const v = env[name]?.trim();
    return Boolean(v && v !== "[SENSITIVE]");
  });
}

function pullVercelEnv(target: EnvTarget, outFile: string): boolean {
  const result = spawnSync(
    "npx",
    ["vercel", "env", "pull", outFile, `--environment=${target}`, "--yes"],
    { encoding: "utf8", shell: true },
  );
  if (result.status !== 0) {
    console.warn(`[check-production-config] vercel env pull ${target} skipped: ${result.stderr?.slice(0, 200)}`);
    return false;
  }
  return true;
}

function checkTarget(target: EnvTarget, env: Record<string, string>) {
  const missing: string[] = [];
  for (const key of REQUIRED_PUBLIC) {
    const v = env[key]?.trim();
    if (!v || v === "[SENSITIVE]") missing.push(key);
  }
  if (!hasGeminiKey(env)) missing.push("GEMINI_* (GOOGLE_GENERATIVE_AI_API_KEY | GEMINI_API_KEY | GOOGLE_API_KEY)");
  return { target, ok: missing.length === 0, missing, gemini: hasGeminiKey(env) };
}

function main(): void {
  const skipPull = process.argv.includes("--skip-vercel-pull");
  const rows = TARGETS.map((target) => {
    const outFile = path.join(process.cwd(), `.env.${target}.check`);
    if (!skipPull) pullVercelEnv(target, outFile);
    const fromFile = parseEnvFile(outFile);
    const merged =
      Object.keys(fromFile).length > 0
        ? fromFile
        : target === "production"
          ? Object.fromEntries(Object.entries(process.env).map(([k, v]) => [k, v ?? ""]))
          : {};
    return checkTarget(target, merged);
  });

  console.log("\n| Environment | Gemini | OK | Missing |");
  console.log("|-------------|--------|----|---------|");
  for (const row of rows) {
    console.log(`| ${row.target} | ${row.gemini ? "yes" : "no"} | ${row.ok ? "yes" : "NO"} | ${row.missing.join(", ") || "—"} |`);
  }

  const productionBad = rows.find((r) => r.target === "production" && !r.ok);
  if (productionBad) {
    console.error("\ncheck-production-config FAILED: Production missing required keys.");
    process.exit(1);
  }
  console.log("\ncheck-production-config OK");
}

main();
