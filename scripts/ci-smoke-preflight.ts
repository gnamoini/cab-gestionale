/**
 * Preflight CI smoke/E2E — fail-fast su credenziali e DB mancanti in CI.
 * Non modifica logica applicativa; solo validazione ambiente orchestrazione.
 *
 * Uso:
 *   npx tsx scripts/ci-smoke-preflight.ts --tier=pr
 *   npx tsx scripts/ci-smoke-preflight.ts --tier=cert
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function loadEnvLocal(): void {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

type Tier = "pr" | "cert" | "local";

function parseTier(): Tier {
  const arg = process.argv.find((a) => a.startsWith("--tier="));
  const v = arg?.split("=")[1]?.trim();
  if (v === "pr" || v === "cert" || v === "local") return v;
  return process.env.CI === "true" ? "pr" : "local";
}

function missing(label: string, value: string | undefined): boolean {
  return !value?.trim();
}

function checkRequired(vars: { label: string; value: string | undefined }[]): string[] {
  return vars.filter((v) => missing(v.label, v.value)).map((v) => v.label);
}

function main(): void {
  const tier = parseTier();
  const isCi = process.env.CI === "true" || tier !== "local";
  const blockers: string[] = [];
  const warnings: string[] = [];

  const supabase = [
    { label: "NEXT_PUBLIC_SUPABASE_URL", value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { label: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    { label: "SUPABASE_SERVICE_ROLE_KEY", value: process.env.SUPABASE_SERVICE_ROLE_KEY },
  ];

  const smokeAdmin = [
    { label: "SMOKE_ADMIN_EMAIL", value: process.env.SMOKE_ADMIN_EMAIL },
    { label: "SMOKE_ADMIN_PASSWORD", value: process.env.SMOKE_ADMIN_PASSWORD },
  ];

  blockers.push(...checkRequired(supabase));
  blockers.push(...checkRequired(smokeAdmin));

  if (tier === "cert") {
    const certOptional = [
      { label: "SUPABASE_DB_URL", value: process.env.SUPABASE_DB_URL },
      { label: "SMOKE_OPERATOR_EMAIL", value: process.env.SMOKE_OPERATOR_EMAIL },
      { label: "SMOKE_OPERATOR_PASSWORD", value: process.env.SMOKE_OPERATOR_PASSWORD },
    ];
    for (const v of certOptional) {
      if (missing(v.label, v.value)) warnings.push(`${v.label} assente (test condizionali potrebbero essere skipped)`);
    }
  } else {
    if (missing("SMOKE_DOCUMENTI_LAVORAZIONE_ID", process.env.SMOKE_DOCUMENTI_LAVORAZIONE_ID)) {
      warnings.push("SMOKE_DOCUMENTI_LAVORAZIONE_ID assente (spec 05 document lifecycle skipped)");
    }
  }

  console.log(`=== CI smoke preflight (tier=${tier}, ci=${isCi}) ===`);

  if (blockers.length > 0) {
    console.error("BLOCKER — variabili obbligatorie mancanti:");
    for (const b of blockers) console.error(`  - ${b}`);
    if (isCi) process.exit(1);
    console.warn("Locale advisory: preflight non blocca (CI=false)");
    process.exit(0);
  }

  console.log("Env smoke/admin/supabase: OK");

  const conn = spawnSync("npx", ["tsx", "scripts/verify-supabase-ci-env.ts"], {
    shell: true,
    stdio: "inherit",
    env: process.env,
  });
  if (conn.status !== 0) {
    console.error("BLOCKER — Supabase non raggiungibile");
    if (isCi) process.exit(1);
    process.exit(0);
  }

  for (const w of warnings) console.warn(`WARN — ${w}`);
  console.log("Preflight PASS");
  process.exit(0);
}

main();
