/**
 * Crea/aggiorna utente admin smoke dedicato in .env.local.
 * Mai usare account operativi reali per E2E su production DB.
 *
 * Uso: npx tsx scripts/ensure-local-smoke-secrets.ts
 * Opzionale: --mark-production  → imposta SMOKE_PRODUCTION_SUPABASE_URL dall'URL Supabase corrente
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { SMOKE_DEDICATED_EMAIL_DOMAIN } from "@/lib/smoke/smoke-target-policy";

const ROOT = process.cwd();
const ENV_LOCAL = path.join(ROOT, ".env.local");
const LOCAL_SMOKE_EMAIL = `local-smoke-admin${SMOKE_DEDICATED_EMAIL_DOMAIN}`;
const LOCAL_SMOKE_USERNAME = "local-smoke-admin";
/** SSOT tenant default — allineato a handle_new_user migration */
const DEFAULT_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

function loadEnvLocal(): void {
  if (!fs.existsSync(ENV_LOCAL)) return;
  for (const line of fs.readFileSync(ENV_LOCAL, "utf8").split(/\r?\n/)) {
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

function upsertEnvLocal(updates: Record<string, string>): void {
  const lines = fs.existsSync(ENV_LOCAL) ? fs.readFileSync(ENV_LOCAL, "utf8").split(/\r?\n/) : [];
  const out: string[] = [];
  const written = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0 || trimmed.startsWith("#")) {
      out.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (key in updates) {
      out.push(`${key}=${updates[key]}`);
      written.add(key);
    } else {
      out.push(line);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!written.has(key)) out.push(`${key}=${value}`);
  }

  fs.writeFileSync(ENV_LOCAL, `${out.join("\n").replace(/\n*$/, "")}\n`, "utf8");
}

async function ensureLocalSmokeUser(admin: SupabaseClient, password: string): Promise<void> {
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw listErr;
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === LOCAL_SMOKE_EMAIL);

  let userId: string;
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log("[local-smoke] Password aggiornata per utente esistente");
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: LOCAL_SMOKE_EMAIL,
      password,
      email_confirm: true,
      app_metadata: {
        cab_ruolo: "admin",
        cab_username: LOCAL_SMOKE_USERNAME,
        cab_nome: "Local Smoke Admin",
      },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log("[local-smoke] Utente smoke creato");
  }

  const { data: existingProfile, error: profileReadErr } = await admin
    .from("profiles")
    .select("id, role_key")
    .eq("id", userId)
    .maybeSingle();
  if (profileReadErr) throw profileReadErr;

  if (existingProfile) {
    const { error: profileErr } = await admin
      .from("profiles")
      .update({
        username: LOCAL_SMOKE_USERNAME,
        nome: "Local Smoke Admin",
        company_id: DEFAULT_COMPANY_ID,
      })
      .eq("id", userId);
    if (profileErr) throw profileErr;
    if (existingProfile.role_key !== "admin") {
      const { error: roleErr } = await admin.rpc("security_set_user_role", {
        p_user_id: userId,
        p_role_key: "admin",
      });
      if (roleErr) throw roleErr;
      console.log("[local-smoke] role_key aggiornato a admin via security_set_user_role");
    }
  } else {
    const { error: profileErr } = await admin.from("profiles").insert({
      id: userId,
      username: LOCAL_SMOKE_USERNAME,
      role_key: "admin",
      nome: "Local Smoke Admin",
      company_id: DEFAULT_COMPANY_ID,
    });
    if (profileErr) throw profileErr;
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  const markProduction = process.argv.includes("--mark-production");

  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) {
    console.error("[local-smoke] SUPABASE_SERVICE_ROLE_KEY mancante in .env.local");
    process.exit(1);
  }

  const { url } = assertSupabasePublicEnv();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const password = randomBytes(24).toString("base64url");
  await ensureLocalSmokeUser(admin, password);

  const updates: Record<string, string> = {
    SMOKE_ADMIN_EMAIL: LOCAL_SMOKE_EMAIL,
    SMOKE_ADMIN_PASSWORD: password,
  };

  if (markProduction) {
    updates.SMOKE_PRODUCTION_SUPABASE_URL = url;
    console.log("[local-smoke] SMOKE_PRODUCTION_SUPABASE_URL impostato (target = production DB)");
    console.log(
      "[local-smoke] Per E2E mutanti su questo DB aggiungi anche SMOKE_ALLOW_PRODUCTION_MUTATIONS=1",
    );
  }

  upsertEnvLocal(updates);

  console.log("[local-smoke] Credenziali scritte in .env.local");
  console.log(`[local-smoke] Email: ${LOCAL_SMOKE_EMAIL}`);
  console.log("[local-smoke] Password: (salvata in .env.local — non committare)");
  console.log("[local-smoke] Dati test: marker AUDIT-* / E2E-* — teardown: npm run smoke:cleanup:apply");
}

void main().catch((err) => {
  console.error("[local-smoke]", err instanceof Error ? err.message : err);
  process.exit(1);
});
