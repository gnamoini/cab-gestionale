#!/usr/bin/env npx tsx
/** ponytail: one-off bootstrap encrypt+insert when provider test rate-limited. */
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
  console.error("Missing AI_MASTER_KEY_ENCRYPTION_KEY / Supabase env in .env.local");
  process.exit(1);
}

const candidates: { slot: string; apiKey: string; priority: number }[] = [];
const k1 = env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
const k2 = env.GEMINI_API_KEY_SECONDARY?.trim();
if (k1) candidates.push({ slot: "google-legacy-01", apiKey: k1, priority: 5 });
if (k2) candidates.push({ slot: "google-legacy-04", apiKey: k2, priority: 8 });

async function main(): Promise<void> {
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  let inserted = 0;
  for (const c of candidates) {
    const fp = fingerprint(c.apiKey);
    const { data: existing } = await sb
      .from("ai_provider_keys")
      .select("id")
      .eq("key_fingerprint", fp)
      .maybeSingle();
    if (existing) {
      console.log("skip existing", c.slot);
      continue;
    }
    const { error } = await sb.from("ai_provider_keys").insert({
      provider: "google",
      slot: c.slot,
      encrypted_key: encryptApiKey(c.apiKey, master),
      key_fingerprint: fp,
      enabled: true,
      priority: c.priority,
      weight: 100,
      status: "healthy",
      source: "env_bootstrap",
      managed_by: "runtime_sync",
    });
    if (error) {
      console.error("insert failed", c.slot, error.message);
      continue;
    }
    inserted += 1;
    console.log("inserted", c.slot);
  }
  console.log("done inserted=", inserted);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
