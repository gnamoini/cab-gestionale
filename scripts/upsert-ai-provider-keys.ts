#!/usr/bin/env npx tsx
/** Upsert N Google keys into ai_provider_keys (production bootstrap). */
import fs from "node:fs";
import path from "node:path";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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

function resolveMasterKey(raw: string): Buffer {
  if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length >= 32) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length >= 32) return buf.subarray(0, 32);
  }
  return createHash("sha256").update(raw).digest();
}

function encryptApiKey(plaintext: string, masterRaw: string): string {
  const key = resolveMasterKey(masterRaw);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function fingerprint(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
}

const env = loadEnvFile(path.join(process.cwd(), ".env.local"));
const master = env.AI_MASTER_KEY_ENCRYPTION_KEY?.trim();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!master || !url || !serviceKey) {
  console.error("Missing AI_MASTER_KEY_ENCRYPTION_KEY or Supabase in .env.local");
  process.exit(1);
}

const keysFile = path.join(process.cwd(), ".ai-prod-keys.tmp");
if (!fs.existsSync(keysFile)) {
  console.error("Missing .ai-prod-keys.tmp (KEY_01=... KEY_02=... KEY_03=... KEY_04=...)");
  process.exit(1);
}
const keyEnv = loadEnvFile(keysFile);
const keys = [
  { slot: "google-01", apiKey: keyEnv.KEY_01, priority: 11 },
  { slot: "google-02", apiKey: keyEnv.KEY_02, priority: 12 },
  { slot: "google-03", apiKey: keyEnv.KEY_03, priority: 13 },
  { slot: "google-04", apiKey: keyEnv.KEY_04, priority: 14 },
].filter((k) => k.apiKey?.trim());

async function main(): Promise<void> {
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  for (const c of keys) {
    const apiKey = c.apiKey.trim();
    const fp = fingerprint(apiKey);
    const row = {
      provider: "google",
      slot: c.slot,
      encrypted_key: encryptApiKey(apiKey, master),
      key_fingerprint: fp,
      enabled: true,
      priority: c.priority,
      weight: 100,
      status: "healthy",
      source: "env_bootstrap",
      managed_by: "runtime_sync",
      disabled_reason: null,
      updated_at: new Date().toISOString(),
    };
    const { data: existingByFp } = await sb
      .from("ai_provider_keys")
      .select("id")
      .eq("key_fingerprint", fp)
      .maybeSingle();
    const { data: existingBySlot } = await sb
      .from("ai_provider_keys")
      .select("id")
      .eq("provider", "google")
      .eq("slot", c.slot)
      .maybeSingle();
    const existing = existingByFp ?? existingBySlot;
    if (existing) {
      await sb.from("ai_provider_keys").update(row).eq("id", existing.id);
      console.log("updated", c.slot);
    } else {
      await sb.from("ai_provider_keys").insert(row);
      console.log("inserted", c.slot);
    }
  }
  const { count } = await sb
    .from("ai_provider_keys")
    .select("id", { count: "exact", head: true })
    .eq("enabled", true);
  console.log("enabled_keys_count", count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
