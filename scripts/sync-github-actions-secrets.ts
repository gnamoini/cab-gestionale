/**
 * Sincronizza secret GitHub Actions per release-gate da file env locali.
 * Uso: GH_TOKEN=<pat con repo> npx tsx scripts/sync-github-actions-secrets.ts
 * Legge .env.local (Supabase) e opzionalmente .env.smoke.local (SMOKE_*).
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sodium = require("tweetsodium") as { seal: (message: Buffer, publicKey: Buffer) => Uint8Array };

const ROOT = process.cwd();
const REPO = "gnamoini/cab-gestionale";

type EnvMap = Record<string, string>;

function parseEnvFile(filePath: string): EnvMap {
  if (!fs.existsSync(filePath)) return {};
  const out: EnvMap = {};
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

async function getPublicKey(token: string): Promise<{ key_id: string; key: string }> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/secrets/public-key`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    throw new Error(`public-key HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<{ key_id: string; key: string }>;
}

async function setSecret(
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

const SECRET_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_DB_URL",
  "SMOKE_ADMIN_EMAIL",
  "SMOKE_ADMIN_PASSWORD",
  "SMOKE_OPERATOR_EMAIL",
  "SMOKE_OPERATOR_PASSWORD",
  "SMOKE_DOCUMENTI_LAVORAZIONE_ID",
] as const;

async function main(): Promise<void> {
  const token = process.env.GH_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    console.error("[sync-secrets] GH_TOKEN o GITHUB_TOKEN richiesto (repo scope).");
    process.exit(1);
  }

  const env = {
    ...parseEnvFile(path.join(ROOT, ".env.local")),
    ...parseEnvFile(path.join(ROOT, ".env.smoke.local")),
  };

  const toSet: { name: string; value: string }[] = [];
  const skipped: string[] = [];
  for (const key of SECRET_KEYS) {
    const value = env[key]?.trim();
    if (!value) {
      skipped.push(key);
      continue;
    }
    toSet.push({ name: key, value });
  }

  if (toSet.length === 0) {
    console.error("[sync-secrets] Nessun valore trovato in .env.local / .env.smoke.local");
    process.exit(1);
  }

  const { key_id, key } = await getPublicKey(token);
  for (const { name, value } of toSet) {
    await setSecret(token, name, value, key_id, key);
    const sha8 = createHash("sha256").update(value).digest("hex").slice(0, 8);
    console.log(`[sync-secrets] OK ${name} (len=${value.length} sha8=${sha8})`);
  }

  if (skipped.length > 0) {
    console.log(`[sync-secrets] Skipped (missing in env files): ${skipped.join(", ")}`);
  }
}

void main().catch((err) => {
  console.error("[sync-secrets]", err instanceof Error ? err.message : err);
  process.exit(1);
});
