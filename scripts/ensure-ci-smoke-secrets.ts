/**
 * Crea/aggiorna utente admin dedicato ai smoke Playwright in CI e sincronizza secret GitHub.
 * Uso: GH_TOKEN=<pat> npx tsx scripts/ensure-ci-smoke-secrets.ts
 * Richiede .env.local con SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_*.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";

const require = createRequire(import.meta.url);
const sodium = require("tweetsodium") as { seal: (message: Buffer, publicKey: Buffer) => Uint8Array };

const ROOT = process.cwd();
const REPO = "gnamoini/cab-gestionale";
const CI_SMOKE_EMAIL = "github-actions-smoke@cab-gestionale.ci";

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

async function getPublicKey(token: string): Promise<{ key_id: string; key: string }> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/secrets/public-key`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`public-key HTTP ${res.status}`);
  return res.json() as Promise<{ key_id: string; key: string }>;
}

async function setGitHubSecret(
  token: string,
  name: string,
  value: string,
  keyId: string,
  publicKey: string,
): Promise<void> {
  const encryptedBytes = sodium.seal(Buffer.from(value, "utf8"), Buffer.from(publicKey, "base64"));
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/secrets/${name}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      encrypted_value: Buffer.from(encryptedBytes).toString("base64"),
      key_id: keyId,
    }),
  });
  if (!res.ok && res.status !== 201 && res.status !== 204) {
    throw new Error(`set ${name} HTTP ${res.status}: ${await res.text()}`);
  }
}

async function ensureCiSmokeUser(admin: SupabaseClient, password: string): Promise<void> {
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw listErr;
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === CI_SMOKE_EMAIL);

  let userId: string;
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log("[ci-smoke] Updated existing CI smoke user password");
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: CI_SMOKE_EMAIL,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log("[ci-smoke] Created CI smoke user");
  }

  const { error: profileErr } = await admin.from("profiles").upsert(
    [
      {
        id: userId,
        email: CI_SMOKE_EMAIL,
        username: "ci-smoke-admin",
        ruolo: "admin",
        nome: "CI Smoke",
      },
    ],
    { onConflict: "id" },
  );
  if (profileErr) throw profileErr;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const ghToken = process.env.GH_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim();
  if (!ghToken) {
    console.error("[ci-smoke] GH_TOKEN richiesto");
    process.exit(1);
  }

  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) {
    console.error("[ci-smoke] SUPABASE_SERVICE_ROLE_KEY mancante in .env.local");
    process.exit(1);
  }

  const { url } = assertSupabasePublicEnv();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const password = randomBytes(24).toString("base64url");
  await ensureCiSmokeUser(admin, password);

  const { key_id, key } = await getPublicKey(ghToken);
  await setGitHubSecret(ghToken, "SMOKE_ADMIN_EMAIL", CI_SMOKE_EMAIL, key_id, key);
  await setGitHubSecret(ghToken, "SMOKE_ADMIN_PASSWORD", password, key_id, key);
  console.log("[ci-smoke] GitHub secrets SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD updated");
}

void main().catch((err) => {
  console.error("[ci-smoke]", err instanceof Error ? err.message : err);
  process.exit(1);
});
