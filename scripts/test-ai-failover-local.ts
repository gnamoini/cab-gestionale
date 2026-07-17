#!/usr/bin/env npx tsx
/** Failover smoke: key1 invalid → request succeeds with key2. */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createDecipheriv, createHash } from "node:crypto";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

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

async function main(): Promise<void> {
  const sb = createClient(url!, serviceKey!, { auth: { persistSession: false } });
  const { data: keys } = await sb
    .from("ai_provider_keys")
    .select("*")
    .eq("enabled", true)
    .order("priority");
  if (!keys || keys.length < 2) {
    console.error("need >=2 keys");
    process.exit(1);
  }
  const k1 = keys[0];
  const k2 = keys[1];
  await sb.from("ai_provider_keys").update({ status: "invalid" }).eq("id", k1.id);
  console.log("marked invalid:", k1.slot);

  const ordered = [k1, k2].filter((k) => k.status !== "invalid" && k.id !== k1.id).concat(
    keys.filter((k) => k.id !== k1.id),
  );
  let success = false;
  for (const row of ordered) {
    if (row.id === k1.id) {
      console.log("[ai-runtime] key", row.slot, "skipped (invalid)");
      continue;
    }
    console.log("[ai-runtime] trying", row.slot);
    try {
      const apiKey = decryptApiKey(row.encrypted_key as string, master!);
      const google = createGoogleGenerativeAI({ apiKey });
      await generateText({
        model: google("gemini-3.5-flash"),
        prompt: "ok",
        abortSignal: AbortSignal.timeout(30_000),
      });
      success = true;
      console.log("[ai-runtime] success via", row.slot);
      break;
    } catch (e) {
      console.log("[ai-runtime] key", row.slot, "failed:", e instanceof Error ? e.message : e);
    }
  }
  await sb.from("ai_provider_keys").update({ status: "healthy" }).eq("id", k1.id);
  if (!success) process.exit(1);
  console.log("failover OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
