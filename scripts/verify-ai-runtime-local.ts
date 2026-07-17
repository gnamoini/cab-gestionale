#!/usr/bin/env npx tsx
/** Local gate: verify DB keys load + dry-run sync preview counts. */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createDecipheriv, createHash } from "node:crypto";

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

function decryptApiKey(ciphertext: string, masterRaw: string): string {
  const key = resolveMasterKey(masterRaw);
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

const env = loadEnvFile(path.join(process.cwd(), ".env.local"));
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const master = env.AI_MASTER_KEY_ENCRYPTION_KEY?.trim();
if (!url || !serviceKey || !master) {
  console.error("missing env");
  process.exit(1);
}

async function main(): Promise<void> {
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await sb.from("ai_provider_keys").select("*").eq("enabled", true);
  if (error) throw error;
  console.log("db_keys_count", data?.length ?? 0);
  for (const row of data ?? []) {
    const plain = decryptApiKey(row.encrypted_key as string, master);
    console.log("key", row.slot, row.source, row.managed_by, "fp_ok", plain.length > 10);
  }
  const auditBefore = await sb.from("ai_provider_key_audit").select("id", { count: "exact", head: true });
  const res = await fetch("http://localhost:3000/api/cron/ai-runtime-sync", {
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });
  const body = await res.json();
  const auditAfter = await sb.from("ai_provider_key_audit").select("id", { count: "exact", head: true });
  console.log("cron_status", res.status, JSON.stringify(body));
  console.log("audit_delta", (auditAfter.count ?? 0) - (auditBefore.count ?? 0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
